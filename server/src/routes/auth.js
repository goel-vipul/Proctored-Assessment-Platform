const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected route
router.get('/me', authenticate, AuthController.me);

module.exports = router;
