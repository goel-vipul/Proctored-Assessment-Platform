import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';

export const TestList = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await client.get('/api/candidate/tests');
      setTests(res.data.tests || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assigned tests.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active / Available</span>;
      case 'upcoming':
        return <span className="badge badge-warning">Upcoming</span>;
      case 'completed':
        return <span className="badge badge-info">Completed</span>;
      case 'expired':
        return <span className="badge badge-danger">Expired</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>My Technical Assessments</h1>
          <p>Assessments and coding tests assigned to you</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Loading assessments...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="card empty-state animate-fade-in">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">No assessments assigned</h3>
          <p>You don't have any pending or completed technical tests at the moment.</p>
        </div>
      ) : (
        <div className="table-container animate-fade-in">
          <table>
            <thead>
              <tr>
                <th>Test Title</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Deadline</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{test.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {test.description?.slice(0, 80)}
                      {test.description?.length > 80 ? '...' : ''}
                    </div>
                  </td>
                  <td>{test.durationMinutes} mins</td>
                  <td>{getStatusBadge(test.testStatus)}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {test.endAt ? new Date(test.endAt).toLocaleString() : 'No Deadline'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {test.testStatus === 'active' && (
                      <Link to={`/candidate/tests/${test.id}/take`} className="btn btn-primary btn-sm">
                        🚀 Start Test
                      </Link>
                    )}
                    {test.testStatus === 'completed' && (
                      <div style={{ display: 'inline-flex', gap: 'var(--space-xs)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
                          Submitted
                        </span>
                        <Link to={`/candidate/results/${test.session?.id}`} className="btn btn-secondary btn-sm">
                          📊 View Score
                        </Link>
                      </div>
                    )}
                    {test.testStatus === 'upcoming' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        Locked
                      </span>
                    )}
                    {test.testStatus === 'expired' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        Expired
                      </span>
                    )}
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
