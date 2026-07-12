const { query } = require('../config/db');

const TestCasesModel = {
  /**
   * Create a test case for a coding question.
   */
  async create({ questionId, input, expectedOutput, isSample }) {
    const result = await query(
      `INSERT INTO test_cases (question_id, input, expected_output, is_sample)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [questionId, input || '', expectedOutput || '', isSample || false]
    );
    return result.rows[0];
  },

  /**
   * Find all test cases for a question.
   */
  async findByQuestionId(questionId) {
    const result = await query(
      'SELECT * FROM test_cases WHERE question_id = $1',
      [questionId]
    );
    return result.rows;
  },

  /**
   * Find only sample test cases for a question (for candidate "Run" action).
   */
  async findSamplesByQuestionId(questionId) {
    const result = await query(
      'SELECT * FROM test_cases WHERE question_id = $1 AND is_sample = true',
      [questionId]
    );
    return result.rows;
  },

  /**
   * Find a test case by ID.
   */
  async findById(id) {
    const result = await query('SELECT * FROM test_cases WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  /**
   * Update a test case.
   */
  async update(id, { input, expectedOutput, isSample }) {
    const sets = [];
    const values = [];
    let paramIndex = 1;

    if (input !== undefined) { sets.push(`input = $${paramIndex++}`); values.push(input); }
    if (expectedOutput !== undefined) { sets.push(`expected_output = $${paramIndex++}`); values.push(expectedOutput); }
    if (isSample !== undefined) { sets.push(`is_sample = $${paramIndex++}`); values.push(isSample); }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE test_cases SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a test case.
   */
  async delete(id) {
    await query('DELETE FROM test_cases WHERE id = $1', [id]);
  },
};

module.exports = TestCasesModel;
