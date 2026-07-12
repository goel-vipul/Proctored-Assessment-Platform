const ProctoringEventsModel = require('../models/proctoringEvents.model');
const SessionsModel = require('../models/sessions.model');

const ProctoringController = {
  /**
   * GET /api/sessions/:id/proctoring-events — Get proctoring events for a session.
   */
  async getEvents(req, res) {
    try {
      const session = await SessionsModel.findById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      const events = await ProctoringEventsModel.findBySessionId(req.params.id);
      res.json({
        session: {
          id: session.id,
          candidateId: session.candidate_id,
          flagged: session.flagged,
          violationCount: session.violation_count,
        },
        events,
      });
    } catch (err) {
      console.error('Get proctoring events error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
};

module.exports = ProctoringController;
