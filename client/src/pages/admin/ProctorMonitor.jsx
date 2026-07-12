import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import Layout from '../../components/Layout';
import ProctoringTimeline from '../../components/ProctoringTimeline';

export const ProctorMonitor = () => {
  const { id: testId } = useParams();
  const { user } = useContext(AuthContext);

  const [test, setTest] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSessionEvents, setSelectedSessionEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('accessToken');
  const socket = useWebSocket(import.meta.env.VITE_WS_URL || '', token);

  const sessionsRef = useRef([]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Initial load
  useEffect(() => {
    fetchInitialData();
  }, [testId]);

  const fetchInitialData = async () => {
    try {
      const tRes = await client.get(`/api/tests/${testId}`);
      setTest(tRes.data.test);

      const sRes = await client.get(`/api/tests/${testId}/results`); // we can get test results, wait, results controller lists test sessions. Let's inspect test controller or result controller.
      // Wait, let's see. We had a GET /api/tests/:id/results route. It calculates list of session results.
      // Let's use that to get candidates status, violation counts etc.
      // Actually we have: ResultsController.getTestResults at GET /api/tests/:id/results
      setSessions(sRes.data.results || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch initial assessment details.');
    } finally {
      setLoading(false);
    }
  };

  // Socket monitoring setup
  useEffect(() => {
    if (!socket) return;

    socket.emit('admin:watch_test', { testId });

    socket.on('proctor:event', (event) => {
      console.log('Received proctor event via WS:', event);
      // Update session violation count in list
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === event.sessionId
            ? { ...s, violationCount: event.violationCount }
            : s
        )
      );

      // If viewing details of this session, append to timeline
      if (selectedSessionId === event.sessionId) {
        setSelectedSessionEvents((prev) => [...prev, {
          id: String(Date.now()),
          event_type: event.eventType,
          client_timestamp: event.timestamp,
          absence_duration_ms: event.absenceDurationMs,
        }]);
      }
    });

    socket.on('proctor:flagged', (flag) => {
      console.log('Session auto-flagged warning:', flag);
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === flag.sessionId
            ? { ...s, flagged: true, violationCount: flag.violationCount }
            : s
        )
      );
    });

    return () => {
      socket.emit('admin:unwatch_test', { testId });
      socket.off('proctor:event');
      socket.off('proctor:flagged');
    };
  }, [socket, testId, selectedSessionId]);

  // Load events for a selected candidate session
  const selectSession = async (sId) => {
    setSelectedSessionId(sId);
    try {
      const res = await client.get(`/api/sessions/${sId}/proctoring-events`);
      setSelectedSessionEvents(res.data.events || []);
    } catch (err) {
      alert('Failed to load events for this candidate.');
    }
  };

  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId);

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>Live proctored watch</h1>
          <p>{test ? `Assesment: ${test.title}` : 'Loading...'}</p>
        </div>
        <Link to="/admin/tests" className="btn btn-secondary">
          Exit Watch
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Initializing proctored monitor...</p>
        </div>
      ) : (
        <div className="test-layout animate-fade-in">
          {/* Sidebar: Candidate Sessions List */}
          <div className="test-sidebar card">
            <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
              Candidate Sessions
            </h3>
            {sessions.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No candidate sessions active.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {sessions.map((s) => {
                  const isActive = s.sessionId === selectedSessionId;
                  return (
                    <button
                      key={s.sessionId}
                      onClick={() => selectSession(s.sessionId)}
                      className="btn"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        width: '100%',
                        padding: 'var(--space-md)',
                        textAlign: 'left',
                        background: isActive ? 'var(--accent-primary-glow)' : 'var(--bg-glass)',
                        border: s.flagged
                          ? '1px solid var(--danger)'
                          : isActive
                          ? '1px solid var(--accent-primary)'
                          : '1px solid var(--border-primary)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{s.candidateName}</span>
                        {s.flagged && <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>Flagged</span>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{s.candidateEmail}</span>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.violationCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                          Violations: {s.violationCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Area: Proctoring Timeline Details */}
          <div className="test-main card">
            {selectedSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
                  <div>
                    <h3>{selectedSession.candidateName}</h3>
                    <p style={{ fontSize: '0.8rem' }}>{selectedSession.candidateEmail}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <span className="badge badge-neutral">Violations: {selectedSession.violationCount}</span>
                    {selectedSession.flagged && <span className="badge badge-danger">High Risk</span>}
                  </div>
                </div>

                <ProctoringTimeline events={selectedSessionEvents} />
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👁️</div>
                <p className="empty-state-title">Select a Candidate Session</p>
                <p>Click on any candidate session to inspect their live focus timeline detail.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
export default ProctorMonitor;
