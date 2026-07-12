import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';

export const Results = () => {
  const { testId } = useParams();

  const [test, setTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchResults();
  }, [testId]);

  const fetchResults = async () => {
    try {
      const res = await client.get(`/api/tests/${testId}/results`);
      setTest(res.data.test);
      setResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch test results.');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseToggle = async () => {
    if (!test) return;
    try {
      const updatedRelease = !test.results_released;
      await client.patch(`/api/tests/${testId}`, { resultsReleased: updatedRelease });
      setTest({ ...test, results_released: updatedRelease });
      alert(`Results ${updatedRelease ? 'released' : 'retracted'} successfully.`);
    } catch (err) {
      alert('Failed to update result release status.');
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/tests/${testId}/results/export`, '_blank');
  };

  const filteredResults = results.filter((r) => {
    const matchesEmail = r.candidateEmail.toLowerCase().includes(filterText.toLowerCase()) ||
                         r.candidateName.toLowerCase().includes(filterText.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'flagged' && (r.flagged || r.violationCount >= 3)) ||
                          (statusFilter === 'passed' && r.passFail === 'Pass') ||
                          (statusFilter === 'failed' && r.passFail === 'Fail');

    return matchesEmail && matchesStatus;
  });

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>Assessment Results</h1>
          <p>{test ? `Assesment: ${test.title}` : 'Loading...'}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button onClick={handleExportCsv} className="btn btn-secondary">
            📥 Export CSV
          </button>
          <Link to={`/admin/tests/${testId}/grading-queue`} className="btn btn-secondary">
            📝 Grade Queue
          </Link>
          <button onClick={handleReleaseToggle} className="btn btn-primary">
            {test?.results_released ? '🔒 Lock Candidate View' : '🔓 Release to Candidates'}
          </button>
          <Link to="/admin/tests" className="btn btn-secondary">
            Exit
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-grid animate-fade-in">
        <div className="stat-card">
          <div className="stat-value">{results.length}</div>
          <div className="stat-label">Submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {results.filter((r) => r.passFail === 'Pass').length}
          </div>
          <div className="stat-label">Passed Candidates</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {results.filter((r) => r.flagged).length}
          </div>
          <div className="stat-label">Flagged Proctor Alerts</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="card animate-fade-in" style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '200px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search candidate name or email..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ width: '180px', marginBottom: 0 }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px' }}
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="flagged">Flagged / Suspicious</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Compiling scoring indices...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="card empty-state animate-fade-in">
          <p>No candidate records found matching filters.</p>
        </div>
      ) : (
        <div className="table-container animate-fade-in">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate Details</th>
                <th>Timer Duration</th>
                <th style={{ textAlign: 'right' }}>Percentage</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th>Result</th>
                <th>Anti-Cheat Proctoring</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => (
                <tr key={r.sessionId}>
                  <td style={{ fontWeight: 700 }}>#{r.rank}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.candidateName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{r.candidateEmail}</div>
                  </td>
                  <td>{r.timeTaken ? `${r.timeTaken} min` : 'expired / auto'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.percentage}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {r.totalScore} / {r.maxScore}
                  </td>
                  <td>
                    <span className={`badge ${r.passFail === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                      {r.passFail}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                      <span className={`badge ${r.flagged ? 'badge-danger' : r.violationCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                        {r.violationCount} Violations
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 'var(--space-xs)' }}>
                      <Link to={`/admin/tests/${testId}/monitor`} className="btn btn-secondary btn-sm" title="View Proctor Events">
                        👁️ Proctor
                      </Link>
                      <Link to={`/admin/tests/${testId}/plagiarism`} className="btn btn-secondary btn-sm" title="View Plagiarism Checks">
                        🛡️ Plagiarism
                      </Link>
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
export default Results;
