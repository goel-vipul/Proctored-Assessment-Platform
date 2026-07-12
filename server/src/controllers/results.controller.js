const { stringify } = require('csv-stringify/sync');
const TestsModel = require('../models/tests.model');
const SessionsModel = require('../models/sessions.model');
const AnswersModel = require('../models/answers.model');
const SubmissionsModel = require('../models/submissions.model');
const QuestionsModel = require('../models/questions.model');
const CodeExecutionsModel = require('../models/codeExecutions.model');

const ResultsController = {
  /**
   * GET /api/tests/:id/results — Get results for all candidates in a test.
   */
  async getTestResults(req, res) {
    try {
      const test = await TestsModel.findById(req.params.id);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const sessions = await SessionsModel.findByTestId(req.params.id);
      const questions = await QuestionsModel.findByTestId(req.params.id);

      const results = [];
      for (const session of sessions) {
        if (session.status === 'in_progress') continue; // Only show completed/expired

        const scores = await computeSessionScores(session, questions);
        results.push({
          sessionId: session.id,
          candidateName: session.candidate_name,
          candidateEmail: session.candidate_email,
          status: session.status,
          flagged: session.flagged,
          violationCount: session.violation_count,
          startedAt: session.started_at,
          submittedAt: session.submitted_at,
          timeTaken: session.submitted_at
            ? Math.round((new Date(session.submitted_at) - new Date(session.started_at)) / 60000)
            : null,
          ...scores,
        });
      }

      // Sort by total score descending and assign ranks
      results.sort((a, b) => b.totalScore - a.totalScore);
      results.forEach((r, i) => { r.rank = i + 1; });

      res.json({ test: { id: test.id, title: test.title, passingScore: test.passing_score }, results });
    } catch (err) {
      console.error('Get test results error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/results/:sessionId — Get detailed results for a single session.
   */
  async getSessionResults(req, res) {
    try {
      const session = await SessionsModel.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      // Candidates can only view their own results, and only if released
      if (req.user.role === 'candidate') {
        if (session.candidate_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied.' });
        }
        const test = await TestsModel.findById(session.test_id);
        if (!test.results_released) {
          return res.status(403).json({ error: 'Results have not been released yet.' });
        }
      }

      const questions = await QuestionsModel.findByTestId(session.test_id);
      const scores = await computeSessionScores(session, questions);

      res.json({ session, ...scores });
    } catch (err) {
      console.error('Get session results error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * PATCH /api/answers/:id/grade — Manual grading for subjective answers.
   */
  async gradeAnswer(req, res) {
    try {
      const { score, feedback } = req.body;
      if (score === undefined || score === null) {
        return res.status(400).json({ error: 'Score is required.' });
      }

      const answer = await AnswersModel.findById(req.params.id);
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found.' });
      }
      if (answer.question_type !== 'subjective') {
        return res.status(400).json({ error: 'Only subjective answers can be manually graded.' });
      }

      // Validate score is within weight
      if (score < 0 || score > answer.question_weight) {
        return res.status(400).json({ error: `Score must be between 0 and ${answer.question_weight}.` });
      }

      // Recruiter ownership check
      if (req.user.role === 'recruiter') {
        const test = await TestsModel.findById(answer.test_id);
        if (test.owner_id !== req.user.id) {
          return res.status(403).json({ error: 'You do not own this test.' });
        }
      }

      const graded = await AnswersModel.grade(req.params.id, {
        score,
        gradedBy: req.user.id,
        feedback,
      });

      res.json({ answer: graded });
    } catch (err) {
      console.error('Grade answer error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/tests/:id/results/export — Export results as CSV.
   */
  async exportCsv(req, res) {
    try {
      const test = await TestsModel.findById(req.params.id);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const sessions = await SessionsModel.findByTestId(req.params.id);
      const questions = await QuestionsModel.findByTestId(req.params.id);

      const rows = [];
      for (const session of sessions) {
        if (session.status === 'in_progress') continue;
        const scores = await computeSessionScores(session, questions);
        rows.push({
          candidateName: session.candidate_name,
          candidateEmail: session.candidate_email,
          status: session.status,
          totalScore: scores.totalScore,
          maxScore: scores.maxScore,
          percentage: scores.percentage,
          passFail: scores.passFail,
          flagged: session.flagged ? 'Yes' : 'No',
          violationCount: session.violation_count,
          timeTaken: session.submitted_at
            ? Math.round((new Date(session.submitted_at) - new Date(session.started_at)) / 60000) + ' min'
            : 'N/A',
        });
      }

      // Sort by score
      rows.sort((a, b) => b.totalScore - a.totalScore);
      rows.forEach((r, i) => { r.rank = i + 1; });

      const csv = stringify(rows, {
        header: true,
        columns: ['rank', 'candidateName', 'candidateEmail', 'totalScore', 'maxScore', 'percentage', 'passFail', 'status', 'flagged', 'violationCount', 'timeTaken'],
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${test.title.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv"`);
      res.send(csv);
    } catch (err) {
      console.error('Export CSV error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/tests/:id/grading-queue — Get ungraded subjective answers for a test.
   */
  async getGradingQueue(req, res) {
    try {
      const test = await TestsModel.findById(req.params.id);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const ungraded = await AnswersModel.findUngradedByTestId(req.params.id);
      res.json({ answers: ungraded });
    } catch (err) {
      console.error('Get grading queue error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

/**
 * Compute all scores for a session.
 */
async function computeSessionScores(session, questions) {
  const answers = await AnswersModel.findBySessionId(session.id);
  const answerMap = {};
  for (const a of answers) {
    answerMap[a.question_id] = a;
  }

  let totalScore = 0;
  let maxScore = 0;
  const perQuestion = [];

  for (const q of questions) {
    maxScore += parseFloat(q.weight);
    let qScore = 0;

    if (q.type === 'coding') {
      // Get the latest "submit" submission
      const submission = await SubmissionsModel.findLatestSubmit(session.id, q.id);
      if (submission && submission.status === 'completed') {
        qScore = parseFloat(submission.score) || 0;
      }
      perQuestion.push({
        questionId: q.id,
        title: q.title || q.body.substring(0, 50),
        type: q.type,
        weight: q.weight,
        score: qScore,
        verdict: submission?.verdict || 'not_attempted',
      });
    } else if (q.type === 'mcq') {
      const answer = answerMap[q.id];
      if (answer && answer.selected_option_ids) {
        const correct = q.correct_option_ids || [];
        const selected = answer.selected_option_ids || [];
        const isCorrect =
          correct.length === selected.length &&
          correct.every((id) => selected.includes(id));
        if (isCorrect) {
          qScore = parseFloat(q.weight);
        } else if (parseFloat(q.negative_marking) > 0 && selected.length > 0) {
          qScore = -parseFloat(q.negative_marking);
        }
      }
      perQuestion.push({
        questionId: q.id,
        title: q.title || q.body.substring(0, 50),
        type: q.type,
        weight: q.weight,
        score: qScore,
        answered: !!(answer && answer.selected_option_ids?.length),
      });
    } else if (q.type === 'subjective') {
      const answer = answerMap[q.id];
      if (answer && answer.manual_score !== null && answer.manual_score !== undefined) {
        qScore = parseFloat(answer.manual_score);
      }
      perQuestion.push({
        questionId: q.id,
        title: q.title || q.body.substring(0, 50),
        type: q.type,
        weight: q.weight,
        score: qScore,
        graded: !!(answer && answer.manual_score !== null),
        feedback: answer?.feedback || null,
      });
    }

    totalScore += qScore;
  }

  // Clamp total score (don't go below 0 due to negative marking)
  totalScore = Math.max(0, totalScore);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;

  return {
    totalScore,
    maxScore,
    percentage,
    passFail: percentage >= parseFloat(session.passing_score || 0) ? 'Pass' : 'Fail',
    perQuestion,
  };
}

module.exports = ResultsController;
