const { query } = require('../config/db');

const SubmissionsModel = {
  /**
   * Create a new code submission.
   */
  async create({ sessionId, questionId, language, sourceCode, kind }) {
    const result = await query(
      `INSERT INTO submissions (session_id, question_id, language, source_code, kind)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sessionId, questionId, language, sourceCode, kind]
    );
    return result.rows[0];
  },

  /**
   * Find a submission by ID.
   */
  async findById(id) {
    const result = await query('SELECT * FROM submissions WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Update submission status and verdict.
   */
  async updateResult(id, { status, verdict, score }) {
    const result = await query(
      `UPDATE submissions SET status = $2, verdict = $3, score = $4
       WHERE id = $1
       RETURNING *`,
      [id, status, verdict, score]
    );
    return result.rows[0] || null;
  },

  /**
   * Update submission status only (e.g., queued → running).
   */
  async updateStatus(id, status) {
    const result = await query(
      'UPDATE submissions SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all submissions for a session.
   */
  async findBySessionId(sessionId) {
    const result = await query(
      `SELECT s.*, q.title as question_title
       FROM submissions s JOIN questions q ON s.question_id = q.id
       WHERE s.session_id = $1
       ORDER BY s.created_at DESC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Find the latest "submit" kind submission for a question in a session.
   * This is the final submission used for scoring.
   */
  async findLatestSubmit(sessionId, questionId) {
    const result = await query(
      `SELECT * FROM submissions
       WHERE session_id = $1 AND question_id = $2 AND kind = 'submit'
       ORDER BY created_at DESC LIMIT 1`,
      [sessionId, questionId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find all final (submit-kind) submissions for a question across all sessions
   * of a given test. Used for plagiarism detection.
   */
  async findAllFinalByQuestionId(questionId) {
    const result = await query(
      `SELECT s.*, ts.candidate_id, u.name as candidate_name, u.email as candidate_email
       FROM submissions s
       JOIN test_sessions ts ON s.session_id = ts.id
       JOIN users u ON ts.candidate_id = u.id
       WHERE s.question_id = $1 AND s.kind = 'submit' AND s.status = 'completed'
       ORDER BY s.created_at DESC`,
      [questionId]
    );
    // Deduplicate: keep only the latest submission per candidate
    const seen = new Set();
    const unique = [];
    for (const row of result.rows) {
      if (!seen.has(row.candidate_id)) {
        seen.add(row.candidate_id);
        unique.push(row);
      }
    }
    return unique;
  },
};

module.exports = SubmissionsModel;
