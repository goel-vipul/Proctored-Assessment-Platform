/**
 * Plagiarism detection orchestrator.
 * Coordinates the full pipeline: fetch submissions → normalize → k-gram → hash → winnow → compare → store.
 */

const { Pool } = require('pg');
const config = require('../config');
const Normalizer = require('./normalizer');
const KGram = require('./kgram');
const Winnowing = require('./winnowing');
const Comparator = require('./comparator');

// Worker has its own DB connection pool
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 5,
});

const PlagiarismDetector = {
  /**
   * Run plagiarism detection for a specific coding question.
   * Compares all final (submit-kind, completed) submissions pairwise.
   *
   * @param {string} questionId - The question ID
   * @returns {Object} { pairs: number, flagged: number }
   */
  async detect(questionId) {
    console.log(`[Plagiarism] Starting detection for question ${questionId}`);

    // Fetch all final submissions for this question
    const submissionsResult = await pool.query(
      `SELECT s.id, s.source_code, s.language, ts.candidate_id
       FROM submissions s
       JOIN test_sessions ts ON s.session_id = ts.id
       WHERE s.question_id = $1 AND s.kind = 'submit' AND s.status = 'completed'
       ORDER BY s.created_at DESC`,
      [questionId]
    );

    // Deduplicate: keep only the latest submission per candidate
    const seen = new Set();
    const submissions = [];
    for (const row of submissionsResult.rows) {
      if (!seen.has(row.candidate_id)) {
        seen.add(row.candidate_id);
        submissions.push(row);
      }
    }

    console.log(`[Plagiarism] Found ${submissions.length} unique submissions for question ${questionId}`);

    if (submissions.length < 2) {
      console.log('[Plagiarism] Need at least 2 submissions. Skipping.');
      return { pairs: 0, flagged: 0 };
    }

    // Process each submission through the pipeline
    const processed = submissions.map((sub) => {
      // Step 1: Normalize
      const normalized = Normalizer.normalize(sub.source_code, sub.language);

      // Step 2: Generate k-gram hashes
      const hashes = KGram.generateHashes(normalized, config.PLAGIARISM_KGRAM_SIZE);

      // Step 3: Winnow to get fingerprints
      const fingerprints = Winnowing.winnow(hashes, config.PLAGIARISM_WINDOW_SIZE);

      return {
        id: sub.id,
        fingerprints,
      };
    });

    // Step 4: Pairwise comparison
    const flaggedPairs = Comparator.comparePairwise(processed, config.PLAGIARISM_THRESHOLD);

    console.log(`[Plagiarism] ${flaggedPairs.length} pairs flagged above threshold (${config.PLAGIARISM_THRESHOLD})`);

    // Step 5: Clear old reports for this question and store new ones
    await pool.query('DELETE FROM plagiarism_reports WHERE question_id = $1', [questionId]);

    for (const pair of flaggedPairs) {
      await pool.query(
        `INSERT INTO plagiarism_reports (question_id, submission_a_id, submission_b_id, similarity_score, matched_fingerprint_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [questionId, pair.submissionAId, pair.submissionBId, pair.similarity, pair.matchedCount]
      );
    }

    const totalPairs = (submissions.length * (submissions.length - 1)) / 2;
    console.log(`[Plagiarism] Detection complete. ${flaggedPairs.length}/${totalPairs} pairs flagged.`);

    return { pairs: totalPairs, flagged: flaggedPairs.length };
  },
};

module.exports = PlagiarismDetector;
