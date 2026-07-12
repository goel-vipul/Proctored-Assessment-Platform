/**
 * Role-based access control middleware factory.
 * Accepts one or more allowed roles and returns middleware that
 * rejects requests from users whose role is not in the allowed list.
 *
 * Usage: router.get('/admin-only', authenticate, authorize('admin'), handler);
 *        router.get('/staff', authenticate, authorize('admin', 'recruiter'), handler);
 *
 * Must be used AFTER the authenticate middleware (req.user must be set).
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden. You do not have permission to access this resource.',
      });
    }

    next();
  };
}

module.exports = { authorize };
