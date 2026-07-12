import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';

export const GradingQueue = () => {
  const { testId } = useParams();

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQueue();
  }, [testId]);

  const fetchQueue = async () => {
    try {
      const tRes = await client.get(`/api/tests/${testId}`);
      setTest(tRes.data.test);

      const qRes = await client.get(`/api/tests/${testId}/grading-queue`);
      setAnswers(qRes.data.answers || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch subjective grading queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (ans) => {
    setSelectedAnswer(ans);
    setScore(ans.manual_score || '');
    setFeedback(ans.feedback || '');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!selectedAnswer) return;
    setError('');
    setSaving(true);

    try {
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > selectedAnswer.question_weight) {
        setError(`Score must be a number between 0 and ${selectedAnswer.question_weight}.`);
        setSaving(false);
        return;
      }

      await client.patch(`/api/answers/${selectedAnswer.id}/grade`, {
        score: scoreNum,
        feedback,
      });

      alert('Answer graded successfully.');
      setSelectedAnswer(null);
      fetchQueue();
    } catch (err) {
      console.error(err);
      setError('Failed to save grade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>Subjective Grading Queue</h1>
          <p>{test ? `Assesment: ${test.title}` : 'Loading...'}</p>
        </div>
        <Link to={`/admin/tests/${testId}/results`} className="btn btn-secondary">
          Back to Results
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Fetching grading queue...</p>
        </div>
      ) : answers.length === 0 ? (
        <div className="card empty-state animate-fade-in">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">Grading Complete!</h3>
          <p>There are no ungraded subjective responses remaining for this assessment.</p>
        </div>
      ) : (
        <div className="test-layout animate-fade-in" style={{ gridTemplateColumns: '320px 1fr' }}>
          {/* Left panel: list of ungraded items */}
          <div className="test-sidebar card">
            <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
              Ungraded Answers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {answers.map((ans) => {
                const isSelected = selectedAnswer?.id === ans.id;
                return (
                  <button
                    key={ans.id}
                    onClick={() => handleSelectAnswer(ans)}
                    className="btn"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      width: '100%',
                      padding: 'var(--space-md)',
                      textAlign: 'left',
                      background: isSelected ? 'var(--accent-primary-glow)' : 'var(--bg-glass)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ans.candidate_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {ans.question_title || 'Subjective Question'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      Weight: {ans.question_weight}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: grading editor */}
          <div className="test-main card">
            {selectedAnswer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
                  Grade Candidate Response
                </h3>

                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                    Question Statement
                  </div>
                  <div style={{ background: 'var(--bg-glass)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>{selectedAnswer.question_body}</p>
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                    Candidate's Submission ({selectedAnswer.candidate_name})
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', whiteSpace: 'pre-wrap' }}>
                    <p style={{ color: 'var(--text-primary)' }}>{selectedAnswer.text_answer}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveGrade} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Score (Max Weight: {selectedAnswer.question_weight})
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder={`0 - ${selectedAnswer.question_weight}`}
                        step="0.5"
                        min="0"
                        max={selectedAnswer.question_weight}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Recruiter Feedback / Comments</label>
                    <textarea
                      className="form-textarea"
                      rows="4"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback on the candidate's answer..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedAnswer(null)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="loading-spinner"></span> : 'Submit Grade'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p className="empty-state-title">Select a Candidate Answer</p>
                <p>Click on any pending answer from the left list to review and assign grades.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
export default GradingQueue;
