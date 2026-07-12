const { v4: uuidv4 } = require('uuid');
const TestsModel = require('../models/tests.model');
const QuestionsModel = require('../models/questions.model');
const TestAssignmentsModel = require('../models/testAssignments.model');

const TestsController = {
  /**
   * POST /api/tests — Create a new test.
   */
  async create(req, res) {
    try {
      const { title, description, durationMinutes, startAt, endAt, shuffleQuestions, passingScore, visibility } = req.body;

      if (!title || !durationMinutes) {
        return res.status(400).json({ error: 'Title and duration are required.' });
      }

      const test = await TestsModel.create({
        ownerId: req.user.id,
        title,
        description,
        durationMinutes,
        startAt,
        endAt,
        shuffleQuestions,
        passingScore,
        visibility,
      });

      res.status(201).json({ test });
    } catch (err) {
      console.error('Create test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/tests — List tests.
   * Admin sees all tests; Recruiter sees only their own.
   */
  async list(req, res) {
    try {
      let tests;
      if (req.user.role === 'admin') {
        tests = await TestsModel.findAll();
      } else {
        tests = await TestsModel.findByOwner(req.user.id);
      }
      res.json({ tests });
    } catch (err) {
      console.error('List tests error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/tests/:id — Get a single test with stats.
   */
  async get(req, res) {
    try {
      const test = await TestsModel.findByIdWithStats(req.params.id);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }

      // Recruiter can only view their own tests
      if (req.user.role === 'recruiter' && test.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      // Include questions
      const questions = await QuestionsModel.findByTestId(test.id);

      res.json({ test, questions });
    } catch (err) {
      console.error('Get test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * PATCH /api/tests/:id — Update a test.
   */
  async update(req, res) {
    try {
      const existing = await TestsModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && existing.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const test = await TestsModel.update(req.params.id, req.body);
      res.json({ test });
    } catch (err) {
      console.error('Update test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * DELETE /api/tests/:id — Delete a test.
   */
  async delete(req, res) {
    try {
      const existing = await TestsModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && existing.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      await TestsModel.delete(req.params.id);
      res.json({ message: 'Test deleted.' });
    } catch (err) {
      console.error('Delete test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/tests/:id/publish — Publish a test.
   */
  async publish(req, res) {
    try {
      const existing = await TestsModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && existing.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const newStatus = existing.status === 'published' ? 'draft' : 'published';
      const test = await TestsModel.update(req.params.id, { status: newStatus });
      res.json({ test, message: `Test ${newStatus === 'published' ? 'published' : 'unpublished'}.` });
    } catch (err) {
      console.error('Publish test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/tests/:id/assign — Assign candidates to a test.
   * Body: { emails: ["email1@example.com", "email2@example.com"] }
   */
  async assign(req, res) {
    try {
      const { emails } = req.body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'An array of candidate emails is required.' });
      }

      const existing = await TestsModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && existing.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const assignments = [];
      for (const email of emails) {
        const inviteToken = uuidv4();
        const assignment = await TestAssignmentsModel.create({
          testId: req.params.id,
          candidateEmail: email.toLowerCase().trim(),
          inviteToken,
        });
        assignments.push(assignment);

        // Mock email transport: log invite link
        const inviteLink = `${req.protocol}://${req.get('host')}/register?invite=${inviteToken}`;
        console.log(`[INVITE] ${email} → ${inviteLink}`);
      }

      res.json({ assignments, message: `${assignments.length} candidate(s) invited.` });
    } catch (err) {
      console.error('Assign test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/tests/:id/clone — Clone a test.
   */
  async clone(req, res) {
    try {
      const existing = await TestsModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Test not found.' });
      }

      const cloned = await TestsModel.clone(req.params.id, req.user.id);
      res.status(201).json({ test: cloned, message: 'Test cloned successfully.' });
    } catch (err) {
      console.error('Clone test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/tests/:id/assignments — List assignments for a test.
   */
  async listAssignments(req, res) {
    try {
      const existing = await TestsModel.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (req.user.role === 'recruiter' && existing.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this test.' });
      }

      const assignments = await TestAssignmentsModel.findByTestId(req.params.id);
      res.json({ assignments });
    } catch (err) {
      console.error('List assignments error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

module.exports = TestsController;
