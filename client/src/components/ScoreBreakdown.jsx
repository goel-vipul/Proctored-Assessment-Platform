import React from 'react';

export const ScoreBreakdown = ({ perQuestion = [] }) => {
  const getQuestionBadge = (type) => {
    switch (type) {
      case 'coding':
        return <span className="badge badge-accent">Coding</span>;
      case 'mcq':
        return <span className="badge badge-info">MCQ</span>;
      case 'subjective':
        return <span className="badge badge-neutral">Subjective</span>;
      default:
        return null;
    }
  };

  const getVerdictText = (q) => {
    if (q.type === 'coding') {
      return (
        <span className={`badge verdict-${q.verdict}`}>
          {q.verdict?.replace('_', ' ')}
        </span>
      );
    }
    if (q.type === 'mcq') {
      return q.answered ? (
        <span className="badge badge-success">Answered</span>
      ) : (
        <span className="badge badge-danger">Not Answered</span>
      );
    }
    if (q.type === 'subjective') {
      return q.graded ? (
        <span className="badge badge-success">Graded</span>
      ) : (
        <span className="badge badge-warning">Awaiting Grade</span>
      );
    }
    return null;
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Question</th>
            <th>Type</th>
            <th>Status / Verdict</th>
            <th style={{ textAlign: 'right' }}>Weight</th>
            <th style={{ textAlign: 'right' }}>Score Obtained</th>
          </tr>
        </thead>
        <tbody>
          {perQuestion.map((q, index) => (
            <tr key={q.questionId || index}>
              <td>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Question {index + 1}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {q.title || 'Click to view'}
                </div>
              </td>
              <td>{getQuestionBadge(q.type)}</td>
              <td>{getVerdictText(q)}</td>
              <td style={{ textAlign: 'right', fontWeight: 500 }}>{q.weight}</td>
              <td
                style={{
                  textAlign: 'right',
                  fontWeight: 600,
                  color: q.score > 0 ? 'var(--success)' : 'var(--text-secondary)',
                }}
              >
                {q.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default ScoreBreakdown;
