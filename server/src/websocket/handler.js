const jwt = require('jsonwebtoken');
const env = require('../config/env');
const rooms = require('./rooms');
const SessionsModel = require('../models/sessions.model');
const ProctoringEventsModel = require('../models/proctoringEvents.model');

/**
 * Initialize WebSocket event handlers on the socket.io server instance.
 */
function initializeWebSocket(io) {
  // Authentication middleware for socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] User connected: ${socket.user.email} (${socket.user.role})`);

    /**
     * join_session — candidate joins their test session room.
     * This allows them to receive submission results.
     */
    socket.on('join_session', async ({ sessionId }) => {
      try {
        const session = await SessionsModel.findById(sessionId);
        if (!session || session.candidate_id !== socket.user.id) {
          socket.emit('error', { message: 'Invalid session.' });
          return;
        }

        socket.join(rooms.sessionRoom(sessionId));
        console.log(`[WS] ${socket.user.email} joined session room: ${sessionId}`);
      } catch (err) {
        console.error('[WS] join_session error:', err);
      }
    });

    /**
     * proctor:violation — candidate reports a proctoring event.
     */
    socket.on('proctor:violation', async ({ sessionId, eventType, clientTimestamp, absenceDurationMs }) => {
      try {
        const session = await SessionsModel.findById(sessionId);
        if (!session || session.candidate_id !== socket.user.id) {
          return;
        }
        if (session.status !== 'in_progress') {
          return;
        }

        // Persist the event
        await ProctoringEventsModel.create({
          sessionId,
          eventType,
          clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : null,
          absenceDurationMs,
        });

        // Increment violation count (only for tab_switch and focus_loss, not regain)
        let updatedSession = session;
        if (eventType === 'tab_switch' || eventType === 'focus_loss') {
          updatedSession = await SessionsModel.incrementViolation(sessionId, env.PROCTORING_FLAG_THRESHOLD);
        }

        // Build the event payload for admin broadcast
        const eventPayload = {
          sessionId,
          candidateId: socket.user.id,
          candidateEmail: socket.user.email,
          eventType,
          timestamp: clientTimestamp || new Date().toISOString(),
          absenceDurationMs,
          violationCount: updatedSession.violation_count,
        };

        // Broadcast to admin dashboard room for this test
        io.to(rooms.adminTestRoom(session.test_id)).emit('proctor:event', eventPayload);

        // If newly flagged, emit flagged event
        if (updatedSession.flagged && !session.flagged) {
          io.to(rooms.adminTestRoom(session.test_id)).emit('proctor:flagged', {
            sessionId,
            candidateId: socket.user.id,
            candidateEmail: socket.user.email,
            violationCount: updatedSession.violation_count,
          });
        }

        console.log(`[WS] Proctor event: ${socket.user.email} → ${eventType} (violations: ${updatedSession.violation_count})`);
      } catch (err) {
        console.error('[WS] proctor:violation error:', err);
      }
    });

    /**
     * admin:watch_test — admin subscribes to a test's live proctoring room.
     */
    socket.on('admin:watch_test', async ({ testId }) => {
      if (!['admin', 'recruiter'].includes(socket.user.role)) {
        socket.emit('error', { message: 'Access denied.' });
        return;
      }

      socket.join(rooms.adminTestRoom(testId));
      console.log(`[WS] ${socket.user.email} watching test: ${testId}`);
    });

    /**
     * admin:unwatch_test — admin unsubscribes from a test's proctoring room.
     */
    socket.on('admin:unwatch_test', ({ testId }) => {
      socket.leave(rooms.adminTestRoom(testId));
    });

    socket.on('disconnect', () => {
      console.log(`[WS] User disconnected: ${socket.user.email}`);
    });
  });

  return io;
}

/**
 * Emit a submission result to the candidate's session room.
 * Called by the worker (via Redis pub/sub) or directly from the server.
 */
function emitSubmissionResult(io, sessionId, result) {
  io.to(rooms.sessionRoom(sessionId)).emit('submission:result', result);
}

/**
 * Emit a session expired event to force the candidate client to lock.
 */
function emitSessionExpired(io, sessionId) {
  io.to(rooms.sessionRoom(sessionId)).emit('session:expired', { sessionId });
}

module.exports = { initializeWebSocket, emitSubmissionResult, emitSessionExpired };
