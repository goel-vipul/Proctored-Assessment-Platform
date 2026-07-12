const { query } = require('../config/db');

const UsersModel = {
  /**
   * Create a new user.
   */
  async create({ name, email, passwordHash, role = 'candidate' }) {
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );
    return result.rows[0];
  },

  /**
   * Find a user by email.
   */
  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by ID.
   */
  async findById(id) {
    const result = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * List all users (admin only).
   */
  async findAll() {
    const result = await query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  },
};

module.exports = UsersModel;
