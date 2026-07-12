const { query } = require('../config/db');

const PlagiarismReportsModel = {
  /**
   * Create a plagiarism report entry (pairwise match).
   */
  async create({ questionId, submissionAId, submissionBId, similarityScore, matchedFingerprintCount }) {
    const result = await query(
      `INSERT INTO plagiarism_reports (question_id, submission_a_id, submission_b_id, similarity_score, matched_fingerprint_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [questionId, submissionAId, submissionBId, similarityScore, matchedFingerprintCount]
    );
    return result.rows[0];
  },

  /**
   * Find all plagiarism reports for a question, sorted by similarity descending.
   */
  async findByQuestionId(questionId) {
    const result = await query(
      `SELECT pr.*,
              sa.source_code as code_a, sa.language as lang_a,
              sb.source_code as code_b, sb.language as lang_b,
              ua.name as candidate_a_name, ua.email as candidate_a_email,
              ub.name as candidate_b_name, ub.email as candidate_b_email
       FROM plagiarism_reports pr
       JOIN submissions sa ON pr.submission_a_id = sa.id
       JOIN submissions sb ON pr.submission_b_id = sb.id
       JOIN test_sessions tsa ON sa.session_id = tsa.id
       JOIN test_sessions tsb ON sb.session_id = tsb.id
       JOIN users ua ON tsa.candidate_id = ua.id
       JOIN users ub ON tsb.candidate_id = ub.id
       WHERE pr.question_id = $1
       ORDER BY pr.similarity_score DESC`,
      [questionId]
    );
    return result.rows;
  },

  /**
   * Delete all reports for a question (before re-running detection).
   */
  async deleteByQuestionId(questionId) {
    await query('DELETE FROM plagiarism_reports WHERE question_id = $1', [questionId]);
  },
};

module.exports = PlagiarismReportsModel;
