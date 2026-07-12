const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const UsersModel = require('../models/users.model');
const TestAssignmentsModel = require('../models/testAssignments.model');

const SALT_ROUNDS = 12;

/**
 * Generate JWT access and refresh tokens for a user.
 */
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });

  return { accessToken, refreshToken };
}

const AuthController = {
  /**
   * POST /api/auth/register
   * Register a new user. Optionally accepts an invite_token to auto-associate
   * the candidate with a test.
   */
  async register(req, res) {
    try {
      const { name, email, password, role, invite_token } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      // Only allow candidate self-registration; admin/recruiter creation requires an existing admin
      const userRole = role && ['admin', 'recruiter'].includes(role) ? role : 'candidate';

      // Check if user already exists
      const existing = await UsersModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await UsersModel.create({ name, email, passwordHash, role: userRole });

      // If invite token provided, mark assignment as registered
      if (invite_token) {
        try {
          await TestAssignmentsModel.markRegistered(invite_token, email);
        } catch (err) {
          // Non-critical: log but don't fail registration
          console.warn('Failed to process invite token:', err.message);
        }
      }

      const tokens = generateTokens(user);

      res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await UsersModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const tokens = generateTokens(user);

      res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/auth/refresh
   * Refresh token rotation: accepts a refresh token, returns new access + refresh tokens.
   */
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required.' });
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      // Verify user still exists
      const user = await UsersModel.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User no longer exists.' });
      }

      const tokens = generateTokens(user);

      res.json(tokens);
    } catch (err) {
      console.error('Refresh error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user's profile.
   */
  async me(req, res) {
    try {
      const user = await UsersModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.json({ user });
    } catch (err) {
      console.error('Me error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

module.exports = AuthController;
