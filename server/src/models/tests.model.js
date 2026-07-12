const { query, getClient } = require('../config/db');

const TestsModel = {
  /**
   * Create a new test.
   */
  async create({ ownerId, title, description, durationMinutes, startAt, endAt, shuffleQuestions, passingScore, visibility }) {
    const result = await query(
      `INSERT INTO tests (owner_id, title, description, duration_minutes, start_at, end_at, shuffle_questions, passing_score, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ownerId, title, description, durationMinutes, startAt || null, endAt || null, shuffleQuestions || false, passingScore || 0, visibility || 'private']
    );
    return result.rows[0];
  },

  /**
   * Find a test by ID.
   */
  async findById(id) {
    const result = await query('SELECT * FROM tests WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * List tests for a specific owner (recruiter).
   */
  async findByOwner(ownerId) {
    const result = await query(
      'SELECT * FROM tests WHERE owner_id = $1 ORDER BY created_at DESC',
      [ownerId]
    );
    return result.rows;
  },

  /**
   * List all tests (admin view).
   */
  async findAll() {
    const result = await query(
      `SELECT t.*, u.name as owner_name, u.email as owner_email
       FROM tests t JOIN users u ON t.owner_id = u.id
       ORDER BY t.created_at DESC`
    );
    return result.rows;
  },

  /**
   * Update a test.
   */
  async update(id, fields) {
    const allowed = ['title', 'description', 'duration_minutes', 'start_at', 'end_at', 'shuffle_questions', 'passing_score', 'visibility', 'status', 'results_released'];
    const sets = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(snakeKey)) {
        sets.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE tests SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a test (cascade deletes questions, sessions, etc.).
   */
  async delete(id) {
    await query('DELETE FROM tests WHERE id = $1', [id]);
  },

  /**
   * Clone a test and all its questions + test cases.
   */
  async clone(id, ownerId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Clone the test
      const testResult = await client.query(
        `INSERT INTO tests (owner_id, title, description, duration_minutes, start_at, end_at, shuffle_questions, passing_score, visibility, status)
         SELECT $2, title || ' (Copy)', description, duration_minutes, start_at, end_at, shuffle_questions, passing_score, visibility, 'draft'
         FROM tests WHERE id = $1
         RETURNING *`,
        [id, ownerId]
      );
      const newTest = testResult.rows[0];

      // Clone questions
      const questionsResult = await client.query(
        'SELECT * FROM questions WHERE test_id = $1 ORDER BY order_index',
        [id]
      );

      for (const q of questionsResult.rows) {
        const newQ = await client.query(
          `INSERT INTO questions (test_id, type, order_index, title, body, weight, allowed_languages, time_limit_ms, memory_limit_mb, options, correct_option_ids, multi_select, negative_marking, max_length)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id`,
          [newTest.id, q.type, q.order_index, q.title, q.body, q.weight, q.allowed_languages, q.time_limit_ms, q.memory_limit_mb, q.options, q.correct_option_ids, q.multi_select, q.negative_marking, q.max_length]
        );

        // Clone test cases for this question
        await client.query(
          `INSERT INTO test_cases (question_id, input, expected_output, is_sample)
           SELECT $2, input, expected_output, is_sample
           FROM test_cases WHERE question_id = $1`,
          [q.id, newQ.rows[0].id]
        );
      }

      await client.query('COMMIT');
      return newTest;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get test with question count and session stats.
   */
  async findByIdWithStats(id) {
    const result = await query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM questions WHERE test_id = t.id) as question_count,
        (SELECT COUNT(*) FROM test_sessions WHERE test_id = t.id) as session_count,
        (SELECT COUNT(*) FROM test_sessions WHERE test_id = t.id AND status = 'submitted') as submitted_count
       FROM tests t WHERE t.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find published public tests for candidate browsing.
   */
  async findPublicTests() {
    const result = await query(
      `SELECT id, title, description, duration_minutes, start_at, end_at, passing_score
       FROM tests
       WHERE visibility = 'public' AND status = 'published'
       ORDER BY created_at DESC`
    );
    return result.rows;
  },
};

module.exports = TestsModel;
