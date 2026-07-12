import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';

export const TestBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: 60,
    startAt: '',
    endAt: '',
    shuffleQuestions: false,
    passingScore: 50,
    visibility: 'private',
  });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchTestDetails();
    }
  }, [id]);

  const fetchTestDetails = async () => {
    try {
      const res = await client.get(`/api/tests/${id}`);
      const { test, questions: testQuestions } = res.data;

      // format ISO strings for datetime-local input fields
      const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        // timezone offset adjustment
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      };

      setFormData({
        title: test.title,
        description: test.description || '',
        durationMinutes: test.duration_minutes,
        startAt: formatDate(test.start_at),
        endAt: formatDate(test.end_at),
        shuffleQuestions: test.shuffle_questions,
        passingScore: parseFloat(test.passing_score),
        visibility: test.visibility,
      });
      setQuestions(testQuestions || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch test details.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...formData,
        startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
        endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
      };

      if (isEdit) {
        await client.patch(`/api/tests/${id}`, payload);
      } else {
        const res = await client.post('/api/tests', payload);
        navigate(`/admin/tests/${res.data.test.id}`);
      }
      alert('Test saved successfully.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save test.');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (index, direction) => {
    const updated = [...questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    // Swap elements
    [updated[index], updated[targetIdx]] = [updated[targetIdx], updated[index]];

    // Recalculate order indices
    const ordering = updated.map((q, idx) => ({ id: q.id, orderIndex: idx }));

    try {
      await client.post(`/api/tests/${id}/questions/reorder`, { ordering });
      setQuestions(updated);
    } catch (err) {
      alert('Failed to reorder questions.');
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await client.delete(`/api/questions/${qId}`);
      setQuestions(questions.filter((q) => q.id !== qId));
    } catch (err) {
      alert('Failed to delete question.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Configure Test' : 'New Test Assessment'}</h1>
          <p>{isEdit ? `ID: ${id}` : 'Set up assessment details and questions'}</p>
        </div>
        <Link to="/admin/tests" className="btn btn-secondary">
          Back to Tests
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Loading details...</p>
        </div>
      ) : (
        <div className="grid-2 animate-fade-in" style={{ gridTemplateColumns: isEdit ? '1fr 1fr' : '1fr' }}>
          {/* Left panel: Test Configuration form */}
          <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
              Assesment Settings
            </h3>

            <div className="form-group">
              <label className="form-label">Test Title</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g. Software Engineer Intern Hiring"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Instructions (Markdown Supported)</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed context, rules, or instructions for candidates..."
                rows="4"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duration (Minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value, 10) || 60)}
                  min="5"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Passing Score (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.passingScore}
                  onChange={(e) => handleInputChange('passingScore', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time Window</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.startAt}
                  onChange={(e) => handleInputChange('startAt', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time Window</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.endAt}
                  onChange={(e) => handleInputChange('endAt', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Shuffle Questions order</label>
                <select
                  className="form-select"
                  value={formData.shuffleQuestions ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('shuffleQuestions', e.target.value === 'true')}
                >
                  <option value="false">Static ordering</option>
                  <option value="true">Shuffle per candidate</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Visibility</label>
                <select
                  className="form-select"
                  value={formData.visibility}
                  onChange={(e) => handleInputChange('visibility', e.target.value)}
                >
                  <option value="private">Private (Invite Only)</option>
                  <option value="public">Public (Open Registration)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }} disabled={saving}>
              {saving ? <span className="loading-spinner"></span> : 'Save Assessment Settings'}
            </button>
          </form>

          {/* Right panel: Questions management (only visible during edit) */}
          {isEdit && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
                <h3>Questions list ({questions.length})</h3>
                <Link to={`/admin/tests/${id}/questions/new`} className="btn btn-primary btn-sm">
                  + Add Question
                </Link>
              </div>

              {questions.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-2xl) 0' }}>
                  <p>No questions added to this test yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '600px', overflowY: 'auto' }}>
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-md)',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {idx + 1}. {q.title || q.body.slice(0, 40) + '...'}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: '4px' }}>
                          <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>{q.type}</span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Weight: {q.weight}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          disabled={idx === 0}
                          onClick={() => handleReorder(idx, 'up')}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          disabled={idx === questions.length - 1}
                          onClick={() => handleReorder(idx, 'down')}
                        >
                          ▼
                        </button>
                        <Link to={`/admin/tests/${id}/questions/${q.id}`} className="btn btn-secondary btn-sm">
                          ✏️ Edit
                        </Link>
                        {q.type === 'coding' && (
                          <Link to={`/admin/questions/${q.id}/test-cases`} className="btn btn-secondary btn-sm">
                            🧪 cases
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteQuestion(q.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};
export default TestBuilder;
