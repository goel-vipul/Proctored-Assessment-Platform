const { Router } = require('express');
const TestsController = require('../controllers/tests.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = Router();

// All routes require auth + admin or recruiter role
router.use(authenticate, authorize('admin', 'recruiter'));

router.post('/', TestsController.create);
router.get('/', TestsController.list);
router.get('/:id', TestsController.get);
router.patch('/:id', TestsController.update);
router.delete('/:id', TestsController.delete);
router.post('/:id/publish', TestsController.publish);
router.post('/:id/assign', TestsController.assign);
router.get('/:id/assignments', TestsController.listAssignments);
router.post('/:id/clone', TestsController.clone);

module.exports = router;
