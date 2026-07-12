const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');

/**
 * BullMQ queue for code execution jobs.
 * Workers consume from this queue to execute candidate code in Docker containers.
 */
const submissionQueue = new Queue('code-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * BullMQ queue for plagiarism detection jobs.
 */
const plagiarismQueue = new Queue('plagiarism-detection', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

module.exports = { submissionQueue, plagiarismQueue };
