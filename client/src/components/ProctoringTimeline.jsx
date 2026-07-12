import React from 'react';

export const ProctoringTimeline = ({ events = [] }) => {
  const getEventBadge = (type) => {
    switch (type) {
      case 'tab_switch':
        return <span className="badge badge-danger">Tab Switched</span>;
      case 'focus_loss':
        return <span className="badge badge-warning">Window Blured</span>;
      case 'focus_regain':
        return <span className="badge badge-success">Focus Regained</span>;
      default:
        return <span className="badge badge-neutral">{type}</span>;
    }
  };

  const getTimelineDotClass = (type) => {
    if (type === 'tab_switch') return 'timeline-dot danger';
    if (type === 'focus_loss') return 'timeline-dot warning';
    return 'timeline-dot';
  };

  const formatDuration = (ms) => {
    if (!ms) return null;
    const seconds = (ms / 1000).toFixed(1);
    return `Absent for ${seconds}s`;
  };

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No Proctoring Events</p>
        <p>Candidate has remained focused inside the browser tab.</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {events.map((event, index) => (
        <div key={event.id || index} className="timeline-item">
          <div className={getTimelineDotClass(event.event_type)}></div>
          <div className="timeline-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              {getEventBadge(event.event_type)}
              <span className="timeline-time">
                {new Date(event.client_timestamp || event.created_at).toLocaleTimeString()}
              </span>
            </div>
            {event.absence_duration_ms > 0 && (
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {formatDuration(event.absence_duration_ms)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
export default ProctoringTimeline;
