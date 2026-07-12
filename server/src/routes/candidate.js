const { Router } = require('express');
const CandidateController = require('../controllers/candidate.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = Router();

// All routes require auth + candidate role
router.use(authenticate, authorize('candidate'));

router.get('/tests', CandidateController.listTests);
router.post('/tests/:testId/start', CandidateController.startTest);
router.get('/sessions/:sessionId', CandidateController.getSession);
router.put('/sessions/:sessionId/answers/:questionId', CandidateController.saveAnswer);
router.post('/sessions/:sessionId/submit', CandidateController.submitTest);

module.exports = router;
