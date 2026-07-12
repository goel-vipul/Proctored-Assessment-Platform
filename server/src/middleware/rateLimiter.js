const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Rate limiter for the code submission endpoint.
 * Limits per candidate session to prevent queue-flooding abuse.
 * Key is based on the authenticated user's ID.
 */
const submissionRateLimiter = rateLimit({
  windowMs: env.SUBMISSION_RATE_LIMIT_WINDOW_MS,
  max: env.SUBMISSION_RATE_LIMIT_MAX,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many submissions. Please wait before submitting again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { submissionRateLimiter };
