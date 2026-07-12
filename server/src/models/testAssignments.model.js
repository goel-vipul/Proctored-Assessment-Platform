const { query } = require('../config/db');

const TestAssignmentsModel = {
  /**
   * Create an assignment (invite) for a candidate email to a test.
   */
  async create({ testId, candidateEmail, inviteToken }) {
    const result = await query(
      `INSERT INTO test_assignments (test_id, candidate_email, invite_token, status)
       VALUES ($1, $2, $3, 'invited')
       ON CONFLICT (test_id, candidate_email) DO UPDATE SET invite_token = $3
       RETURNING *`,
      [testId, candidateEmail, inviteToken]
    );
    return result.rows[0];
  },

  /**
   * Find an assignment by invite token.
   */
  async findByToken(token) {
    const result = await query(
      'SELECT * FROM test_assignments WHERE invite_token = $1',
      [token]
    );
    return result.rows[0] || null;
  },

  /**
   * Mark an assignment as registered when the candidate signs up via invite link.
   */
  async markRegistered(inviteToken, email) {
    const result = await query(
      `UPDATE test_assignments SET status = 'registered'
       WHERE invite_token = $1 AND candidate_email = $2
       RETURNING *`,
      [inviteToken, email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all assignments for a test.
   */
  async findByTestId(testId) {
    const result = await query(
      'SELECT * FROM test_assignments WHERE test_id = $1 ORDER BY candidate_email',
      [testId]
    );
    return result.rows;
  },

  /**
   * Find all assignments for a candidate email.
   */
  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM test_assignments WHERE candidate_email = $1',
      [email]
    );
    return result.rows;
  },

  /**
   * Delete an assignment.
   */
  async delete(id) {
    await query('DELETE FROM test_assignments WHERE id = $1', [id]);
  },
};

module.exports = TestAssignmentsModel;
