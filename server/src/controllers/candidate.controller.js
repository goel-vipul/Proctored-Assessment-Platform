const TestsModel = require('../models/tests.model');
const QuestionsModel = require('../models/questions.model');
const TestCasesModel = require('../models/testCases.model');
const SessionsModel = require('../models/sessions.model');
const AnswersModel = require('../models/answers.model');
const TestAssignmentsModel = require('../models/testAssignments.model');

const CandidateController = {
  /**
   * GET /api/candidate/tests — List assigned/available tests for the candidate.
   */
  async listTests(req, res) {
    try {
      const candidateEmail = req.user.email;
      const candidateId = req.user.id;

      // Get tests assigned via invite
      const assignments = await TestAssignmentsModel.findByEmail(candidateEmail);
      const assignedTestIds = assignments.map((a) => a.test_id);

      // Get public published tests
      const publicTests = await TestsModel.findPublicTests();

      // Get candidate's sessions to determine status
      const sessions = await SessionsModel.findByCandidateId(candidateId);
      const sessionMap = {};
      for (const s of sessions) {
        sessionMap[s.test_id] = s;
      }

      // Merge and deduplicate
      const testIds = new Set([...assignedTestIds, ...publicTests.map((t) => t.id)]);
      const tests = [];

      for (const testId of testIds) {
        const test = await TestsModel.findById(testId);
        if (!test || test.status !== 'published') continue;

        const session = sessionMap[testId];
        const now = new Date();

        let testStatus = 'upcoming';
        if (session) {
          testStatus = session.status === 'in_progress' ? 'active' : 'completed';
        } else if (test.end_at && new Date(test.end_at) < now) {
          testStatus = 'expired';
        } else if (test.start_at && new Date(test.start_at) <= now) {
          testStatus = 'active';
        }

        tests.push({
          id: test.id,
          title: test.title,
          description: test.description,
          durationMinutes: test.duration_minutes,
          startAt: test.start_at,
          endAt: test.end_at,
          passingScore: test.passing_score,
          testStatus,
          session: session ? {
            id: session.id,
            status: session.status,
            startedAt: session.started_at,
            hardEndAt: session.hard_end_at,
            submittedAt: session.submitted_at,
          } : null,
        });
      }

      res.json({ tests });
    } catch (err) {
      console.error('List candidate tests error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/candidate/tests/:testId/start — Start a test session.
   */
  async startTest(req, res) {
    try {
      const { testId } = req.params;
      const candidateId = req.user.id;

      const test = await TestsModel.findById(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found.' });
      }
      if (test.status !== 'published') {
        return res.status(400).json({ error: 'This test is not available.' });
      }

      // Check if candidate is assigned (for private tests)
      if (test.visibility === 'private') {
        const assignments = await TestAssignmentsModel.findByEmail(req.user.email);
        const isAssigned = assignments.some((a) => a.test_id === testId);
        if (!isAssigned) {
          return res.status(403).json({ error: 'You are not assigned to this test.' });
        }
      }

      // Check time window
      const now = new Date();
      if (test.start_at && new Date(test.start_at) > now) {
        return res.status(400).json({ error: 'This test has not started yet.' });
      }
      if (test.end_at && new Date(test.end_at) < now) {
        return res.status(400).json({ error: 'This test has expired.' });
      }

      // Check if session already exists
      const existingSession = await SessionsModel.findByTestAndCandidate(testId, candidateId);
      if (existingSession) {
        if (existingSession.status !== 'in_progress') {
          return res.status(400).json({ error: 'You have already completed this test.' });
        }
        // Return existing in-progress session
        const questions = await QuestionsModel.findForCandidate(testId);
        const answers = await AnswersModel.findBySessionId(existingSession.id);

        // If shuffle is on, use a deterministic shuffle based on session id
        const orderedQuestions = test.shuffle_questions
          ? shuffleWithSeed(questions, existingSession.id)
          : questions;

        // Attach sample test cases to coding questions
        for (const q of orderedQuestions) {
          if (q.type === 'coding') {
            q.sampleTestCases = await TestCasesModel.findSamplesByQuestionId(q.id);
          }
        }

        return res.json({ session: existingSession, questions: orderedQuestions, answers });
      }

      // Compute hard end timestamp
      const durationMs = test.duration_minutes * 60 * 1000;
      let hardEndAt = new Date(now.getTime() + durationMs);
      // Cap by test end window
      if (test.end_at && new Date(test.end_at) < hardEndAt) {
        hardEndAt = new Date(test.end_at);
      }

      const session = await SessionsModel.create({
        testId,
        candidateId,
        hardEndAt,
      });

      const questions = await QuestionsModel.findForCandidate(testId);
      const orderedQuestions = test.shuffle_questions
        ? shuffleWithSeed(questions, session.id)
        : questions;

      // Attach sample test cases to coding questions
      for (const q of orderedQuestions) {
        if (q.type === 'coding') {
          q.sampleTestCases = await TestCasesModel.findSamplesByQuestionId(q.id);
        }
      }

      res.status(201).json({ session, questions: orderedQuestions, answers: [] });
    } catch (err) {
      console.error('Start test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * GET /api/candidate/sessions/:sessionId — Get session data with questions and answers.
   */
  async getSession(req, res) {
    try {
      const session = await SessionsModel.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
      }
      if (session.candidate_id !== req.user.id) {
        return res.status(403).json({ error: 'This is not your session.' });
      }

      // Check if session has expired server-side
      if (session.status === 'in_progress' && new Date(session.hard_end_at) < new Date()) {
        await SessionsModel.expire(session.id);
        session.status = 'expired';
      }

      const test = await TestsModel.findById(session.test_id);
      const questions = await QuestionsModel.findForCandidate(session.test_id);
      const orderedQuestions = test.shuffle_questions
        ? shuffleWithSeed(questions, session.id)
        : questions;

      // Attach sample test cases to coding questions
      for (const q of orderedQuestions) {
        if (q.type === 'coding') {
          q.sampleTestCases = await TestCasesModel.findSamplesByQuestionId(q.id);
        }
      }

      const answers = await AnswersModel.findBySessionId(session.id);

      res.json({ session, questions: orderedQuestions, answers });
    } catch (err) {
      console.error('Get session error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * PUT /api/candidate/sessions/:sessionId/answers/:questionId — Autosave an answer.
   */
  async saveAnswer(req, res) {
    try {
      const session = await SessionsModel.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
      }
      if (session.candidate_id !== req.user.id) {
        return res.status(403).json({ error: 'This is not your session.' });
      }
      if (session.status !== 'in_progress') {
        return res.status(400).json({ error: 'This session is no longer active.' });
      }

      // Server-side timer check
      if (new Date(session.hard_end_at) < new Date()) {
        await SessionsModel.expire(session.id);
        return res.status(400).json({ error: 'Session has expired.' });
      }

      const { selectedOptionIds, textAnswer } = req.body;

      const answer = await AnswersModel.upsert({
        sessionId: req.params.sessionId,
        questionId: req.params.questionId,
        selectedOptionIds,
        textAnswer,
      });

      res.json({ answer });
    } catch (err) {
      console.error('Save answer error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },

  /**
   * POST /api/candidate/sessions/:sessionId/submit — Submit (finalize) the test.
   */
  async submitTest(req, res) {
    try {
      const session = await SessionsModel.findById(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
      }
      if (session.candidate_id !== req.user.id) {
        return res.status(403).json({ error: 'This is not your session.' });
      }
      if (session.status !== 'in_progress') {
        return res.status(400).json({ error: 'This session is already submitted or expired.' });
      }

      const submitted = await SessionsModel.submit(session.id);
      res.json({ session: submitted, message: 'Test submitted successfully.' });
    } catch (err) {
      console.error('Submit test error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

/**
 * Deterministic shuffle using a seed string (session id).
 * Ensures the same shuffle order on every request for the same session.
 */
function shuffleWithSeed(array, seed) {
  const arr = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  // Fisher-Yates with seeded pseudo-random
  for (let i = arr.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

module.exports = CandidateController;
