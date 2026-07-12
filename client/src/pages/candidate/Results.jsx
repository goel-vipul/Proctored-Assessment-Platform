import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';
import ScoreBreakdown from '../../components/ScoreBreakdown';

export const Results = () => {
  const { sessionId } = useParams();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessionResults();
  }, [sessionId]);

  const fetchSessionResults = async () => {
    try {
      const res = await client.get(`/api/results/${sessionId}`);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch score report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>Assessment Results Report</h1>
          <p>Score evaluation and detailed breakdown for your session</p>
        </div>
        <Link to="/candidate/tests" className="btn btn-secondary">
          Back to Tests
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Compiling score report...</p>
        </div>
      ) : result ? (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{result.percentage}%</div>
              <div className="stat-label">Percentage Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {result.totalScore} / {result.maxScore}
              </div>
              <div className="stat-label">Points Obtained</div>
            </div>
            <div className="stat-card">
              <div
                className="stat-value"
                style={{ color: result.passFail === 'Pass' ? 'var(--success)' : 'var(--danger)' }}
              >
                {result.passFail}
              </div>
              <div className="stat-label">Verification Verdict</div>
            </div>
          </div>

          {/* Details & Breakdown Table */}
          <div className="card">
            <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
              Detailed breakdown
            </h3>
            <ScoreBreakdown perQuestion={result.perQuestion} />
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <p>No results details found for this session.</p>
        </div>
      )}
    </Layout>
  );
};
export default Results;
