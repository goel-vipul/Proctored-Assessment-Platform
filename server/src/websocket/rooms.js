/**
 * WebSocket room management.
 * 
 * Room naming conventions:
 * - `session:${sessionId}` — candidate's personal session room (for submission results)
 * - `test:${testId}:admin` — admin/recruiter room for live proctoring of a test
 */

const rooms = {
  /**
   * Get the room name for a candidate's session.
   */
  sessionRoom(sessionId) {
    return `session:${sessionId}`;
  },

  /**
   * Get the room name for admin monitoring of a test.
   */
  adminTestRoom(testId) {
    return `test:${testId}:admin`;
  },
};

module.exports = rooms;
