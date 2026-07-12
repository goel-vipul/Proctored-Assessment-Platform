const { Router } = require('express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { submissionQueue, plagiarismQueue } = require('../queue/producer');

const router = Router();

/**
 * Bull Board dashboard for queue observability.
 * Available at /api/admin/queues
 */
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(submissionQueue),
    new BullMQAdapter(plagiarismQueue),
  ],
  serverAdapter,
});

router.use('/queues', authenticate, authorize('admin'), serverAdapter.getRouter());

module.exports = router;
