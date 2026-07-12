const { query } = require('../config/db');

const ProctoringEventsModel = {
  /**
   * Create a proctoring event.
   */
  async create({ sessionId, eventType, clientTimestamp, absenceDurationMs }) {
    const result = await query(
      `INSERT INTO proctoring_events (session_id, event_type, client_timestamp, absence_duration_ms)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, eventType, clientTimestamp || null, absenceDurationMs || null]
    );
    return result.rows[0];
  },

  /**
   * Find all proctoring events for a session.
   */
  async findBySessionId(sessionId) {
    const result = await query(
      'SELECT * FROM proctoring_events WHERE session_id = $1 ORDER BY created_at',
      [sessionId]
    );
    return result.rows;
  },
};

module.exports = ProctoringEventsModel;
