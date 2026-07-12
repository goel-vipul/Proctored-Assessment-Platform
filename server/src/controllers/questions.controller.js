const QuestionsModel = require('../models/questions.model');
const TestCasesModel = require('../models/testCases.model');
const TestsModel = require('../models/tests.model');

const QuestionsController = {
  /**
   * POST /api/tests/:testId/questions — Add a question to a test.
   */
  async create(req, res) {
    try {
      const test = await TestsModel.findById(req.params.testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      // Cannot add questions to a published test with active sessions
      if (test.status === 'published') {
        return res.status(400).json({ error: 'Cannot modify questions on a published test. Unpublish it first.' });
      }

      const { type, orderIndex, title, body, weight, allowedLanguages, timeLimitMs, memoryLimitMb, options, correctOptionIds, multiSelect, negativeMarking, maxLength } = req.body;

      if (!type || !body) {
        return res.status(400).json({ error: 'Question type and body are required.' });
      }

      // Validate type-specific required fields
      if (type === 'coding' && (!allowedLanguages || allowedLanguages.length === 0)) {
        return res.status(400).json({ error: 'Coding questions require at least one allowed language.' });
      }
      if (type === 'mcq' && (!options || options.length < 2)) {
        return res.status(400).json({ error: 'MCQ questions require at least 2 options.' });
      }
      if (type === 'mcq' && (!correctOptionIds || correctOptionIds.length === 0)) {
        return res.status(400).json({ error: 'MCQ questions require at least one correct option.' });
      }

      const question = await QuestionsModel.create({
        testId: req.params.testId,
        type,
        orderIndex,
        title,
        body,
        weight,
        allowedLanguages,
        timeLimitMs,
        memoryLimitMb,
        options,
        correctOptionIds,
        multiSelect,
        negativeMarking,
        maxLength,
      });

      res.status(201).json({ question });
    } catch (err) {
      console.error('Create question error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * PATCH /api/questions/:id — Update a question.
   */
  async update(req, res) {
    try {
      const question = await QuestionsModel.findById(req.params.id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }

      const test = await TestsModel.findById(question.test_id);
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const updated = await QuestionsModel.update(req.params.id, req.body);
      res.json({ question: updated });
    } catch (err) {
      console.error('Update question error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * DELETE /api/questions/:id — Delete a question.
   */
  async delete(req, res) {
    try {
      const question = await QuestionsModel.findById(req.params.id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }

      const test = await TestsModel.findById(question.test_id);
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      await QuestionsModel.delete(req.params.id);
      res.json({ message: 'Question deleted.' });
    } catch (err) {
      console.error('Delete question error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/questions/:id/test-cases — Add a test case to a coding question.
   */
  async createTestCase(req, res) {
    try {
      const question = await QuestionsModel.findById(req.params.id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      if (question.type !== 'coding') {
        return res.status(400).json({ error: 'Test cases can only be added to coding questions.' });
      }

      const test = await TestsModel.findById(question.test_id);
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const { input, expectedOutput, isSample } = req.body;
      const testCase = await TestCasesModel.create({
        questionId: req.params.id,
        input,
        expectedOutput,
        isSample,
      });

      res.status(201).json({ testCase });
    } catch (err) {
      console.error('Create test case error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * PATCH /api/test-cases/:id — Update a test case.
   */
  async updateTestCase(req, res) {
    try {
      const testCase = await TestCasesModel.findById(req.params.id);
      if (!testCase) {
        return res.status(404).json({ error: 'Test case not found.' });
      }

      const question = await QuestionsModel.findById(testCase.question_id);
      const test = await TestsModel.findById(question.test_id);
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const updated = await TestCasesModel.update(req.params.id, req.body);
      res.json({ testCase: updated });
    } catch (err) {
      console.error('Update test case error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * DELETE /api/test-cases/:id — Delete a test case.
   */
  async deleteTestCase(req, res) {
    try {
      const testCase = await TestCasesModel.findById(req.params.id);
      if (!testCase) {
        return res.status(404).json({ error: 'Test case not found.' });
      }

      const question = await QuestionsModel.findById(testCase.question_id);
      const test = await TestsModel.findById(question.test_id);
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      await TestCasesModel.delete(req.params.id);
      res.json({ message: 'Test case deleted.' });
    } catch (err) {
      console.error('Delete test case error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/questions/:id/test-cases — List test cases for a question.
   */
  async listTestCases(req, res) {
    try {
      const question = await QuestionsModel.findById(req.params.id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }

      const testCases = await TestCasesModel.findByQuestionId(req.params.id);
      res.json({ testCases });
    } catch (err) {
      console.error('List test cases error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/tests/:testId/questions/reorder — Reorder questions.
   * Body: { ordering: [{ id, orderIndex }] }
   */
  async reorder(req, res) {
    try {
      const { ordering } = req.body;
      if (!ordering || !Array.isArray(ordering)) {
        return res.status(400).json({ error: 'Ordering array is required.' });
      }

      const test = await TestsModel.findById(req.params.testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      await QuestionsModel.reorder(req.params.testId, ordering);
      const questions = await QuestionsModel.findByTestId(req.params.testId);
      res.json({ questions });
    } catch (err) {
      console.error('Reorder questions error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

module.exports = QuestionsController;
