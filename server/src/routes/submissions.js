const { Router } = require('express');
const SubmissionsController = require('../controllers/submissions.controller');
const { authenticate } = require('../middleware/auth');
const { submissionRateLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.post('/', authenticate, submissionRateLimiter, SubmissionsController.create);
router.get('/:id', authenticate, SubmissionsController.get);

module.exports = router;
