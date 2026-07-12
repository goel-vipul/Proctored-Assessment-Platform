const { query } = require('../config/db');

const AnswersModel = {
  /**
   * Upsert an answer (autosave for MCQ/subjective).
   * Uses ON CONFLICT to handle both create and update.
   */
  async upsert({ sessionId, questionId, selectedOptionIds, textAnswer }) {
    const result = await query(
      `INSERT INTO answers (session_id, question_id, selected_option_ids, text_answer, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (session_id, question_id)
       DO UPDATE SET
         selected_option_ids = COALESCE($3, answers.selected_option_ids),
         text_answer = COALESCE($4, answers.text_answer),
         updated_at = NOW()
       RETURNING *`,
      [sessionId, questionId, selectedOptionIds || null, textAnswer || null]
    );
    return result.rows[0];
  },

  /**
   * Find all answers for a session.
   */
  async findBySessionId(sessionId) {
    const result = await query(
      `SELECT a.*, q.type as question_type, q.title as question_title, q.weight as question_weight
       FROM answers a JOIN questions q ON a.question_id = q.id
       WHERE a.session_id = $1`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Find a specific answer.
   */
  async findBySessionAndQuestion(sessionId, questionId) {
    const result = await query(
      'SELECT * FROM answers WHERE session_id = $1 AND question_id = $2',
      [sessionId, questionId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find an answer by ID.
   */
  async findById(id) {
    const result = await query(
      `SELECT a.*, q.type as question_type, q.weight as question_weight, q.test_id,
              ts.candidate_id, ts.test_id as session_test_id
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       JOIN test_sessions ts ON a.session_id = ts.id
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Grade a subjective answer (manual grading by recruiter/admin).
   */
  async grade(id, { score, gradedBy, feedback }) {
    const result = await query(
      `UPDATE answers
       SET manual_score = $2, graded_by = $3, graded_at = NOW(), feedback = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, score, gradedBy, feedback || null]
    );
    return result.rows[0] || null;
  },

  /**
   * Find ungraded subjective answers for a test.
   */
  async findUngradedByTestId(testId) {
    const result = await query(
      `SELECT a.*, q.title as question_title, q.body as question_body, q.weight as question_weight,
              u.name as candidate_name, u.email as candidate_email, ts.id as session_id
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       JOIN test_sessions ts ON a.session_id = ts.id
       JOIN users u ON ts.candidate_id = u.id
       WHERE q.test_id = $1 AND q.type = 'subjective' AND a.manual_score IS NULL AND ts.status IN ('submitted', 'expired')
       ORDER BY u.name`,
      [testId]
    );
    return result.rows;
  },
};

module.exports = AnswersModel;
