const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 4000,

  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'assessment_platform',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Worker
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY, 10) || 4,

  // Plagiarism
  PLAGIARISM_KGRAM_SIZE: parseInt(process.env.PLAGIARISM_KGRAM_SIZE, 10) || 25,
  PLAGIARISM_WINDOW_SIZE: parseInt(process.env.PLAGIARISM_WINDOW_SIZE, 10) || 4,
  PLAGIARISM_THRESHOLD: parseFloat(process.env.PLAGIARISM_THRESHOLD) || 0.70,

  // Proctoring
  PROCTORING_FLAG_THRESHOLD: parseInt(process.env.PROCTORING_FLAG_THRESHOLD, 10) || 3,

  // Docker Sandbox
  SANDBOX_CPU_LIMIT: parseFloat(process.env.SANDBOX_CPU_LIMIT) || 0.5,
  SANDBOX_DEFAULT_MEMORY_MB: parseInt(process.env.SANDBOX_DEFAULT_MEMORY_MB, 10) || 256,
  SANDBOX_PIDS_LIMIT: parseInt(process.env.SANDBOX_PIDS_LIMIT, 10) || 64,

  // Rate Limiting
  SUBMISSION_RATE_LIMIT_WINDOW_MS: parseInt(process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS, 10) || 60000,
  SUBMISSION_RATE_LIMIT_MAX: parseInt(process.env.SUBMISSION_RATE_LIMIT_MAX, 10) || 10,
};

// Validate required variables in production
if (env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = env;
