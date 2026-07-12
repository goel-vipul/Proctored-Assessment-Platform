const { Router } = require('express');
const ResultsController = require('../controllers/results.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = Router();

// Admin/Recruiter routes
router.get('/tests/:id/results', authenticate, authorize('admin', 'recruiter'), ResultsController.getTestResults);
router.get('/tests/:id/results/export', authenticate, authorize('admin', 'recruiter'), ResultsController.exportCsv);
router.get('/tests/:id/grading-queue', authenticate, authorize('admin', 'recruiter'), ResultsController.getGradingQueue);
router.patch('/answers/:id/grade', authenticate, authorize('admin', 'recruiter'), ResultsController.gradeAnswer);

// Candidate can view their own results (if released)
router.get('/results/:sessionId', authenticate, ResultsController.getSessionResults);

module.exports = router;
