const { query } = require('../config/db');

const CodeExecutionsModel = {
  /**
   * Create a code execution result for a single test case.
   */
  async create({ submissionId, testCaseId, verdict, actualOutput, execTimeMs, memoryUsedMb }) {
    const result = await query(
      `INSERT INTO code_executions (submission_id, test_case_id, verdict, actual_output, exec_time_ms, memory_used_mb)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [submissionId, testCaseId, verdict, actualOutput || '', execTimeMs || 0, memoryUsedMb || 0]
    );
    return result.rows[0];
  },

  /**
   * Find all executions for a submission.
   */
  async findBySubmissionId(submissionId) {
    const result = await query(
      `SELECT ce.*, tc.input, tc.expected_output, tc.is_sample
       FROM code_executions ce
       JOIN test_cases tc ON ce.test_case_id = tc.id
       WHERE ce.submission_id = $1
       ORDER BY ce.created_at`,
      [submissionId]
    );
    return result.rows;
  },

  /**
   * Find executions for a submission, showing only sample test case details.
   * Hidden test case details (input, expected_output) are masked.
   */
  async findBySubmissionIdForCandidate(submissionId) {
    const result = await query(
      `SELECT ce.id, ce.submission_id, ce.test_case_id, ce.verdict, ce.exec_time_ms, ce.memory_used_mb,
              tc.is_sample,
              CASE WHEN tc.is_sample THEN ce.actual_output ELSE NULL END as actual_output,
              CASE WHEN tc.is_sample THEN tc.input ELSE NULL END as input,
              CASE WHEN tc.is_sample THEN tc.expected_output ELSE NULL END as expected_output
       FROM code_executions ce
       JOIN test_cases tc ON ce.test_case_id = tc.id
       WHERE ce.submission_id = $1
       ORDER BY ce.created_at`,
      [submissionId]
    );
    return result.rows;
  },
};

module.exports = CodeExecutionsModel;
