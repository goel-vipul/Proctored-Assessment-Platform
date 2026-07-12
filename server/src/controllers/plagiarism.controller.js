const QuestionsModel = require('../models/questions.model');
const TestsModel = require('../models/tests.model');
const { plagiarismQueue } = require('../queue/producer');
const PlagiarismReportsModel = require('../models/plagiarismReports.model');

const PlagiarismController = {
  /**
   * POST /api/tests/:id/plagiarism/run — Trigger plagiarism detection for a test.
   */
  async run(req, res) {
    try {
      const test = await TestsModel.findById(req.params.id);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      // Get all coding questions for this test
      const questions = await QuestionsModel.findByTestId(req.params.id);
      const codingQuestions = questions.filter((q) => q.type === 'coding');

      if (codingQuestions.length === 0) {
        return res.status(400).json({ error: 'No coding questions found in this test.' });
      }

      // Enqueue plagiarism jobs for each coding question
      for (const question of codingQuestions) {
        await plagiarismQueue.add('detect', {
          questionId: question.id,
          testId: req.params.id,
        });
      }

      res.json({
        message: `Plagiarism detection queued for ${codingQuestions.length} coding question(s).`,
        questionIds: codingQuestions.map((q) => q.id),
      });
    } catch (err) {
      console.error('Run plagiarism error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/questions/:id/plagiarism — Get plagiarism report for a question.
   */
  async getReport(req, res) {
    try {
      const question = await QuestionsModel.findById(req.params.id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }

      const test = await TestsModel.findById(question.test_id);
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const reports = await PlagiarismReportsModel.findByQuestionId(req.params.id);
      res.json({ question: { id: question.id, title: question.title }, reports });
    } catch (err) {
      console.error('Get plagiarism report error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

module.exports = PlagiarismController;
