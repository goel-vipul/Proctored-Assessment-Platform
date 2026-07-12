const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'assessment_platform',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',

  // Worker
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY, 10) || 4,

  // Sandbox
  SANDBOX_CPU_LIMIT: parseFloat(process.env.SANDBOX_CPU_LIMIT) || 0.5,
  SANDBOX_PIDS_LIMIT: parseInt(process.env.SANDBOX_PIDS_LIMIT, 10) || 64,

  // Plagiarism
  PLAGIARISM_KGRAM_SIZE: parseInt(process.env.PLAGIARISM_KGRAM_SIZE, 10) || 25,
  PLAGIARISM_WINDOW_SIZE: parseInt(process.env.PLAGIARISM_WINDOW_SIZE, 10) || 4,
  PLAGIARISM_THRESHOLD: parseFloat(process.env.PLAGIARISM_THRESHOLD) || 0.70,

  // Server (for WebSocket client)
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:4000',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
};
