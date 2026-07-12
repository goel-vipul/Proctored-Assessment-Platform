import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';

export const TestList = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await client.get('/api/tests');
      setTests(res.data.tests || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tests.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async (testId) => {
    try {
      await client.post(`/api/tests/${testId}/publish`);
      fetchTests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle status.');
    }
  };

  const handleClone = async (testId) => {
    try {
      await client.post(`/api/tests/${testId}/clone`);
      fetchTests();
    } catch (err) {
      alert('Failed to clone test.');
    }
  };

  const handleDelete = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test? All questions, test cases, and candidate results will be permanently removed.')) {
      return;
    }
    try {
      await client.delete(`/api/tests/${testId}`);
      setTests(tests.filter((t) => t.id !== testId));
    } catch (err) {
      alert('Failed to delete test.');
    }
  };

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>Assesments Dashboard</h1>
          <p>Create, manage, and monitor candidate tests</p>
        </div>
        <Link to="/admin/tests/new" className="btn btn-primary">
          + Create Test
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Fetching tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="card empty-state animate-fade-in">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">No assessments created yet</h3>
          <p>Get started by creating your first coding or MCQ technical test.</p>
          <Link to="/admin/tests/new" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
            Create Test
          </Link>
        </div>
      ) : (
        <div className="table-container animate-fade-in">
          <table>
            <thead>
              <tr>
                <th>Test Title</th>
                <th>Visibility</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Dates</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{test.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      ID: {test.id}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${test.visibility === 'public' ? 'badge-info' : 'badge-neutral'}`}>
                      {test.visibility}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${test.status === 'published' ? 'badge-success' : test.status === 'closed' ? 'badge-danger' : 'badge-warning'}`}>
                      {test.status}
                    </span>
                  </td>
                  <td>{test.duration_minutes} mins</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {test.start_at ? new Date(test.start_at).toLocaleDateString() : 'Immediate'} -{' '}
                    {test.end_at ? new Date(test.end_at).toLocaleDateString() : 'No Limit'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 'var(--space-xs)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Link to={`/admin/tests/${test.id}/results`} className="btn btn-secondary btn-sm" title="View Results">
                        📊 Results
                      </Link>
                      <Link to={`/admin/tests/${test.id}/monitor`} className="btn btn-secondary btn-sm" title="Live Monitor">
                        👁️ Live
                      </Link>
                      <Link to={`/admin/tests/${test.id}/assign`} className="btn btn-secondary btn-sm" title="Assign Candidates">
                        ✉️ Invite
                      </Link>
                      <Link to={`/admin/tests/${test.id}`} className="btn btn-secondary btn-sm" title="Edit Test">
                        ⚙️ Edit
                      </Link>
                      <button onClick={() => handlePublishToggle(test.id)} className="btn btn-secondary btn-sm">
                        {test.status === 'published' ? '🛑 Unpublish' : '🚀 Publish'}
                      </button>
                      <button onClick={() => handleClone(test.id)} className="btn btn-secondary btn-sm" title="Clone Test">
                        👥 Clone
                      </button>
                      <button onClick={() => handleDelete(test.id)} className="btn btn-danger btn-sm" title="Delete Test">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};
export default TestList;
