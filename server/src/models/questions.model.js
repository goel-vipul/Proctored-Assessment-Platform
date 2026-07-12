const { query } = require('../config/db');

const QuestionsModel = {
  /**
   * Create a new question.
   */
  async create({ testId, type, orderIndex, title, body, weight, allowedLanguages, timeLimitMs, memoryLimitMb, options, correctOptionIds, multiSelect, negativeMarking, maxLength }) {
    const result = await query(
      `INSERT INTO questions (test_id, type, order_index, title, body, weight, allowed_languages, time_limit_ms, memory_limit_mb, options, correct_option_ids, multi_select, negative_marking, max_length)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [testId, type, orderIndex || 0, title, body, weight || 1, allowedLanguages || null, timeLimitMs || null, memoryLimitMb || null, options ? JSON.stringify(options) : null, correctOptionIds || null, multiSelect || false, negativeMarking || 0, maxLength || null]
    );
    return result.rows[0];
  },

  /**
   * Find all questions for a test, ordered by order_index.
   */
  async findByTestId(testId) {
    const result = await query(
      'SELECT * FROM questions WHERE test_id = $1 ORDER BY order_index',
      [testId]
    );
    return result.rows;
  },

  /**
   * Find a question by ID.
   */
  async findById(id) {
    const result = await query('SELECT * FROM questions WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Update a question.
   */
  async update(id, fields) {
    const allowed = ['type', 'order_index', 'title', 'body', 'weight', 'allowed_languages', 'time_limit_ms', 'memory_limit_mb', 'options', 'correct_option_ids', 'multi_select', 'negative_marking', 'max_length'];
    const sets = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(snakeKey)) {
        if (snakeKey === 'options') {
          sets.push(`${snakeKey} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          sets.push(`${snakeKey} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE questions SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a question.
   */
  async delete(id) {
    await query('DELETE FROM questions WHERE id = $1', [id]);
  },

  /**
   * Reorder questions within a test.
   * Expects an array of { id, orderIndex }.
   */
  async reorder(testId, ordering) {
    for (const item of ordering) {
      await query(
        'UPDATE questions SET order_index = $1 WHERE id = $2 AND test_id = $3',
        [item.orderIndex, item.id, testId]
      );
    }
  },

  /**
   * Find questions for candidate view (strip hidden data for coding questions).
   * For coding questions, only include sample test cases, never hidden ones.
   */
  async findForCandidate(testId) {
    const result = await query(
      `SELECT id, test_id, type, order_index, title, body, weight,
              allowed_languages, time_limit_ms, memory_limit_mb,
              options, multi_select, negative_marking, max_length
       FROM questions WHERE test_id = $1 ORDER BY order_index`,
      [testId]
    );
    // Strip correct_option_ids — candidates should never see correct answers
    return result.rows;
  },
};

module.exports = QuestionsModel;
