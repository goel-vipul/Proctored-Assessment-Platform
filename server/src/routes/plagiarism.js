const { Router } = require('express');
const PlagiarismController = require('../controllers/plagiarism.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = Router();

router.post('/tests/:id/plagiarism/run', authenticate, authorize('admin', 'recruiter'), PlagiarismController.run);
router.get('/questions/:id/plagiarism', authenticate, authorize('admin', 'recruiter'), PlagiarismController.getReport);

module.exports = router;
