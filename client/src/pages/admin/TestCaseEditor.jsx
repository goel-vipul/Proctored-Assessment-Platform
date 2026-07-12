import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';
import TestCaseForm from '../../components/TestCaseForm';

export const TestCaseEditor = () => {
  const { questionId } = useParams();

  const [testCases, setTestCases] = useState([]);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingCase, setEditingCase] = useState(null); // active case being added/edited
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [questionId]);

  const fetchData = async () => {
    try {
      const qRes = await client.get(`/api/questions/${questionId}/test-cases`); // Wait, question routes are nested? Let's check router.
      // Actually /api/questions/:id/test-cases
      setTestCases(qRes.data.testCases || []);

      // Let's get parent test to verify details (we can infer from questionId but let's query backend)
      // We don't have separate GET question details route but we can get it or we can fetch test cases.
      // Wait, is there a get question details endpoint? No, we list test cases.
      // Let's fetch test details by listing test cases.
    } catch (err) {
      console.error(err);
      setError('Failed to fetch test cases.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingCase({
      input: '',
      expected_output: '',
      is_sample: false,
    });
  };

  const handleEdit = (tc) => {
    setEditingCase({ ...tc });
  };

  const handleInputChange = (field, value) => {
    setEditingCase({ ...editingCase, [field]: value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const isNew = !editingCase.id;
      const payload = {
        input: editingCase.input,
        expectedOutput: editingCase.expected_output,
        isSample: editingCase.is_sample,
      };

      if (isNew) {
        const res = await client.post(`/api/questions/${questionId}/test-cases`, payload);
        setTestCases([...testCases, res.data.testCase]);
      } else {
        const res = await client.patch(`/api/test-cases/${editingCase.id}`, payload);
        setTestCases(testCases.map((tc) => (tc.id === editingCase.id ? res.data.testCase : tc)));
      }

      setEditingCase(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save test case.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tcId) => {
    if (!window.confirm('Delete this test case?')) return;
    try {
      await client.delete(`/api/test-cases/${tcId}`);
      setTestCases(testCases.filter((tc) => tc.id !== tcId));
    } catch (err) {
      alert('Failed to delete test case.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Manage Test Cases</h1>
          <p>Configure evaluation parameters for this coding task</p>
        </div>
        <button onClick={() => window.history.back()} className="btn btn-secondary">
          Back
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Loading cases...</p>
        </div>
      ) : (
        <div className="grid-2 animate-fade-in" style={{ gridTemplateColumns: editingCase ? '1fr 1fr' : '1fr' }}>
          {/* Left panel: List existing test cases */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
              <h3>Test cases ({testCases.length})</h3>
              {!editingCase && (
                <button onClick={handleCreateNew} className="btn btn-primary btn-sm">
                  + Add Test Case
                </button>
              )}
            </div>

            {testCases.length === 0 ? (
              <div className="empty-state">
                <p>No test cases defined yet. Coding questions require at least one test case.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {testCases.map((tc, idx) => (
                  <div
                    key={tc.id}
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
                      <div style={{ fontWeight: 600 }}>Test Case #{idx + 1}</div>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: '4px' }}>
                        <span className={`badge ${tc.is_sample ? 'badge-success' : 'badge-neutral'}`}>
                          {tc.is_sample ? 'Sample' : 'Hidden'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          Input length: {tc.input?.length || 0} chars
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button onClick={() => handleEdit(tc)} className="btn btn-secondary btn-sm">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(tc.id)} className="btn btn-danger btn-sm">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: Active Edit / Create form */}
          {editingCase && (
            <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
                {editingCase.id ? 'Modify Test Case' : 'New Test Case'}
              </h3>

              <TestCaseForm testCaseData={editingCase} onChange={handleInputChange} />

              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                <button type="button" onClick={() => setEditingCase(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner"></span> : 'Save Case'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Layout>
  );
};
export default TestCaseEditor;
