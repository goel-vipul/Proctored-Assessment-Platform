const { Worker } = require('bullmq');
const { Pool } = require('pg');
const Redis = require('ioredis');
const config = require('./config');
const containerManager = require('./sandbox/containerManager');
const VerdictComputer = require('./verdictComputer');
const PlagiarismDetector = require('./plagiarism');

// Redis connection for BullMQ
const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// Worker's own DB connection pool
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 10,
});

// Redis pub/sub client for publishing results to the server
const redisPub = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
});

// ============================================================
// Code Execution Worker
// ============================================================

const executionWorker = new Worker(
  'code-execution',
  async (job) => {
    const { submissionId, language, sourceCode, testCases, timeLimitMs, memoryLimitMb, questionWeight, totalTestCases } = job.data;

    console.log(`[Worker] Processing submission ${submissionId} (${language}, ${testCases.length} test cases)`);

    // Update submission status to 'running'
    await pool.query(
      "UPDATE submissions SET status = 'running' WHERE id = $1",
      [submissionId]
    );

    // Get session ID for WebSocket notification
    const subResult = await pool.query(
      'SELECT session_id FROM submissions WHERE id = $1',
      [submissionId]
    );
    const sessionId = subResult.rows[0]?.session_id;

    const verdicts = [];
    const perTestCase = [];
    let compilationError = false;

    for (const testCase of testCases) {
      // If we already hit a compilation error, skip remaining test cases
      if (compilationError) {
        verdicts.push('compile_error');
        await pool.query(
          `INSERT INTO code_executions (submission_id, test_case_id, verdict, actual_output, exec_time_ms, memory_used_mb)
           VALUES ($1, $2, 'compile_error', '', 0, 0)`,
          [submissionId, testCase.id]
        );
        perTestCase.push({
          testCaseId: testCase.id,
          isSample: testCase.isSample,
          verdict: 'compile_error',
          actualOutput: '',
          execTimeMs: 0,
        });
        continue;
      }

      // Execute code in Docker container
      const result = await containerManager.execute({
        language,
        sourceCode,
        stdin: testCase.input,
        timeLimitMs,
        memoryLimitMb,
      });

      // Compute verdict
      const verdict = VerdictComputer.computeTestCaseVerdict({
        actualOutput: result.stdout,
        expectedOutput: testCase.expectedOutput,
        timedOut: result.timedOut,
        exitCode: result.exitCode,
        stderr: result.stderr,
        memoryUsedMb: result.memoryUsedMb,
        memoryLimitMb,
      });

      verdicts.push(verdict);

      if (verdict === 'compile_error') {
        compilationError = true;
      }

      // Store execution result
      await pool.query(
        `INSERT INTO code_executions (submission_id, test_case_id, verdict, actual_output, exec_time_ms, memory_used_mb)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [submissionId, testCase.id, verdict, result.stdout || '', result.execTimeMs || 0, result.memoryUsedMb || 0]
      );

      perTestCase.push({
        testCaseId: testCase.id,
        isSample: testCase.isSample,
        verdict,
        actualOutput: testCase.isSample ? (result.stdout || '') : undefined,
        execTimeMs: result.execTimeMs || 0,
      });
    }

    // Compute overall verdict and score
    const overallVerdict = VerdictComputer.computeOverallVerdict(verdicts);
    const score = VerdictComputer.computeScore(verdicts, questionWeight || 1);

    // Update submission with final result
    await pool.query(
      "UPDATE submissions SET status = 'completed', verdict = $2, score = $3 WHERE id = $1",
      [submissionId, overallVerdict, score]
    );

    console.log(`[Worker] Submission ${submissionId}: ${overallVerdict} (score: ${score})`);

    // Publish result via Redis pub/sub so the API server can emit via WebSocket
    const resultPayload = {
      submissionId,
      sessionId,
      status: 'completed',
      verdict: overallVerdict,
      score,
      perTestCase,
    };

    await redisPub.publish('submission:result', JSON.stringify(resultPayload));

    return resultPayload;
  },
  {
    connection: redisConnection,
    concurrency: config.WORKER_CONCURRENCY,
  }
);

executionWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed.`);
});

executionWorker.on('failed', async (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err.message);

  // Mark submission as failed
  if (job?.data?.submissionId) {
    try {
      await pool.query(
        "UPDATE submissions SET status = 'failed' WHERE id = $1",
        [job.data.submissionId]
      );

      // Notify via Redis pub/sub
      const subResult = await pool.query(
        'SELECT session_id FROM submissions WHERE id = $1',
        [job.data.submissionId]
      );

      await redisPub.publish('submission:result', JSON.stringify({
        submissionId: job.data.submissionId,
        sessionId: subResult.rows[0]?.session_id,
        status: 'failed',
        verdict: 'runtime_error',
        score: 0,
        perTestCase: [],
        error: err.message,
      }));
    } catch (e) {
      console.error('[Worker] Failed to update failed submission:', e.message);
    }
  }
});

// ============================================================
// Plagiarism Detection Worker
// ============================================================

const plagiarismWorker = new Worker(
  'plagiarism-detection',
  async (job) => {
    const { questionId, testId } = job.data;
    console.log(`[Plagiarism Worker] Processing question ${questionId} from test ${testId}`);

    const result = await PlagiarismDetector.detect(questionId);

    console.log(`[Plagiarism Worker] Question ${questionId}: ${result.flagged}/${result.pairs} pairs flagged.`);
    return result;
  },
  {
    connection: redisConnection,
    concurrency: 2, // Plagiarism detection doesn't need high concurrency
  }
);

plagiarismWorker.on('completed', (job) => {
  console.log(`[Plagiarism Worker] Job ${job.id} completed.`);
});

plagiarismWorker.on('failed', (job, err) => {
  console.error(`[Plagiarism Worker] Job ${job.id} failed:`, err.message);
});

// ============================================================
// Redis Subscriber for submission results (server-side relay)
// ============================================================
// The server process subscribes to 'submission:result' channel
// and emits via socket.io to the appropriate session room.
// This is handled in server/src/index.js as a separate subscriber.

console.log(`
╔══════════════════════════════════════════════════════╗
║  Proctored Assessment Platform — Worker              ║
║  Code Execution Concurrency: ${config.WORKER_CONCURRENCY}                      ║
║  Plagiarism Detection Concurrency: 2                 ║
║  Listening on Redis: ${config.REDIS_HOST}:${config.REDIS_PORT}              ║
╚══════════════════════════════════════════════════════╝
`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await executionWorker.close();
  await plagiarismWorker.close();
  await pool.end();
  redisPub.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down...');
  await executionWorker.close();
  await plagiarismWorker.close();
  await pool.end();
  redisPub.disconnect();
  process.exit(0);
});
