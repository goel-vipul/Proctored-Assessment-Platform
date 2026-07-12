const { query } = require('../config/db');

const SessionsModel = {
  /**
   * Create a new test session.
   */
  async create({ testId, candidateId, hardEndAt }) {
    const result = await query(
      `INSERT INTO test_sessions (test_id, candidate_id, hard_end_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [testId, candidateId, hardEndAt]
    );
    return result.rows[0];
  },

  /**
   * Find a session by ID.
   */
  async findById(id) {
    const result = await query('SELECT * FROM test_sessions WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a session for a specific candidate and test.
   */
  async findByTestAndCandidate(testId, candidateId) {
    const result = await query(
      'SELECT * FROM test_sessions WHERE test_id = $1 AND candidate_id = $2',
      [testId, candidateId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all sessions for a test (admin/recruiter view).
   */
  async findByTestId(testId) {
    const result = await query(
      `SELECT ts.*, u.name as candidate_name, u.email as candidate_email
       FROM test_sessions ts JOIN users u ON ts.candidate_id = u.id
       WHERE ts.test_id = $1
       ORDER BY ts.started_at DESC`,
      [testId]
    );
    return result.rows;
  },

  /**
   * Find all sessions for a candidate.
   */
  async findByCandidateId(candidateId) {
    const result = await query(
      `SELECT ts.*, t.title as test_title, t.description as test_description,
              t.duration_minutes, t.start_at, t.end_at
       FROM test_sessions ts JOIN tests t ON ts.test_id = t.id
       WHERE ts.candidate_id = $1
       ORDER BY ts.started_at DESC`,
      [candidateId]
    );
    return result.rows;
  },

  /**
   * Submit (lock) a session.
   */
  async submit(id) {
    const result = await query(
      `UPDATE test_sessions
       SET status = 'submitted', submitted_at = NOW()
       WHERE id = $1 AND status = 'in_progress'
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Expire a session (server-side timer enforcement).
   */
  async expire(id) {
    const result = await query(
      `UPDATE test_sessions
       SET status = 'expired', submitted_at = NOW()
       WHERE id = $1 AND status = 'in_progress'
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Increment violation count and optionally flag the session.
   */
  async incrementViolation(id, flagThreshold) {
    const result = await query(
      `UPDATE test_sessions
       SET violation_count = violation_count + 1,
           flagged = CASE WHEN violation_count + 1 >= $2 THEN true ELSE flagged END
       WHERE id = $1
       RETURNING *`,
      [id, flagThreshold]
    );
    return result.rows[0] || null;
  },

  /**
   * Get active sessions for a test (for live proctoring dashboard).
   */
  async findActiveByTestId(testId) {
    const result = await query(
      `SELECT ts.*, u.name as candidate_name, u.email as candidate_email
       FROM test_sessions ts JOIN users u ON ts.candidate_id = u.id
       WHERE ts.test_id = $1 AND ts.status = 'in_progress'
       ORDER BY ts.flagged DESC, ts.violation_count DESC`,
      [testId]
    );
    return result.rows;
  },
};

module.exports = SessionsModel;
