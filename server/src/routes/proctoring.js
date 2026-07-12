const { Router } = require('express');
const ProctoringController = require('../controllers/proctoring.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = Router();

router.get('/sessions/:id/proctoring-events', authenticate, authorize('admin', 'recruiter'), ProctoringController.getEvents);

module.exports = router;
