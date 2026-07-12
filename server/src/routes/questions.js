const { Router } = require('express');
const QuestionsController = require('../controllers/questions.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = Router();

// All routes require auth + admin or recruiter role
router.use(authenticate, authorize('admin', 'recruiter'));

// Question CRUD (nested under tests for create, standalone for update/delete)
router.post('/tests/:testId/questions', QuestionsController.create);
router.post('/tests/:testId/questions/reorder', QuestionsController.reorder);
router.patch('/questions/:id', QuestionsController.update);
router.delete('/questions/:id', QuestionsController.delete);

// Test cases
router.get('/questions/:id/test-cases', QuestionsController.listTestCases);
router.post('/questions/:id/test-cases', QuestionsController.createTestCase);
router.patch('/test-cases/:id', QuestionsController.updateTestCase);
router.delete('/test-cases/:id', QuestionsController.deleteTestCase);

module.exports = router;
