const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * JWT authentication middleware.
 * Extracts the access token from the Authorization header (Bearer scheme),
 * verifies it, and attaches the decoded user payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please refresh your token.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

module.exports = { authenticate };
