const SubmissionsModel = require('../models/submissions.model');
const CodeExecutionsModel = require('../models/codeExecutions.model');
const SessionsModel = require('../models/sessions.model');
const QuestionsModel = require('../models/questions.model');
const TestCasesModel = require('../models/testCases.model');
const { submissionQueue } = require('../queue/producer');

const SubmissionsController = {
  /**
   * POST /api/submissions — Create a code submission and enqueue for execution.
   * Body: { sessionId, questionId, language, code, kind: 'run'|'submit' }
   */
  async create(req, res) {
    try {
      const { sessionId, questionId, language, code, kind } = req.body;

      if (!sessionId || !questionId || !language || !code || !kind) {
        return res.status(400).json({ error: 'sessionId, questionId, language, code, and kind are required.' });
      }

      if (!['run', 'submit'].includes(kind)) {
        return res.status(400).json({ error: 'kind must be "run" or "submit".' });
      }

      // Validate session belongs to user and is active
      const session = await SessionsModel.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
      }
      if (session.candidate_id !== req.user.id) {
        return res.status(403).json({ error: 'This is not your session.' });
      }
      if (session.status !== 'in_progress') {
        return res.status(400).json({ error: 'Session is no longer active.' });
      }

      // Server-side timer check
      if (new Date(session.hard_end_at) < new Date()) {
        await SessionsModel.expire(session.id);
        return res.status(400).json({ error: 'Session has expired.' });
      }

      // Validate question exists and is coding type
      const question = await QuestionsModel.findById(questionId);
      if (!question || question.test_id !== session.test_id) {
        return res.status(404).json({ error: 'Question not found in this test.' });
      }
      if (question.type !== 'coding') {
        return res.status(400).json({ error: 'Submissions are only for coding questions.' });
      }

      // Validate language is allowed
      if (question.allowed_languages && !question.allowed_languages.includes(language)) {
        return res.status(400).json({ error: `Language "${language}" is not allowed for this question.` });
      }

      // Get test cases based on kind
      let testCases;
      if (kind === 'run') {
        testCases = await TestCasesModel.findSamplesByQuestionId(questionId);
      } else {
        testCases = await TestCasesModel.findByQuestionId(questionId);
      }

      if (testCases.length === 0) {
        return res.status(400).json({ error: 'No test cases found for this question.' });
      }

      // Create submission record
      const submission = await SubmissionsModel.create({
        sessionId,
        questionId,
        language,
        sourceCode: code,
        kind,
      });

      // Enqueue the job for execution
      await submissionQueue.add('execute', {
        submissionId: submission.id,
        language,
        sourceCode: code,
        testCases: testCases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expected_output,
          isSample: tc.is_sample,
        })),
        timeLimitMs: question.time_limit_ms || 5000,
        memoryLimitMb: question.memory_limit_mb || 256,
        questionWeight: question.weight,
        totalTestCases: testCases.length,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      // Respond immediately (202 Accepted) — result comes via WebSocket
      res.status(202).json({
        submission: {
          id: submission.id,
          status: submission.status,
          kind: submission.kind,
          language: submission.language,
          createdAt: submission.created_at,
        },
        message: 'Submission queued for execution. Results will be delivered via WebSocket.',
      });
    } catch (err) {
      console.error('Create submission error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/submissions/:id — Get submission status/result (poll fallback).
   */
  async get(req, res) {
    try {
      const submission = await SubmissionsModel.findById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      // Verify ownership
      const session = await SessionsModel.findById(submission.session_id);
      const isOwner = session.candidate_id === req.user.id;
      const isStaff = ['admin', 'recruiter'].includes(req.user.role);

      if (!isOwner && !isStaff) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Get per-test-case results
      let executions;
      if (isStaff) {
        executions = await CodeExecutionsModel.findBySubmissionId(submission.id);
      } else {
        executions = await CodeExecutionsModel.findBySubmissionIdForCandidate(submission.id);
      }

      res.json({ submission, executions });
    } catch (err) {
      console.error('Get submission error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

module.exports = SubmissionsController;
