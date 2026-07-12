import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';
import CodeDiffViewer from '../../components/CodeDiffViewer';

export const PlagiarismReport = () => {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const questionId = searchParams.get('question');

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [testId, questionId]);

  const fetchInitialData = async () => {
    try {
      const tRes = await client.get(`/api/tests/${testId}`);
      setTest(tRes.data.test);
      const codingQs = (tRes.data.questions || []).filter((q) => q.type === 'coding');
      setQuestions(codingQs);

      if (questionId) {
        const rRes = await client.get(`/api/questions/${questionId}/plagiarism`);
        setReports(rRes.data.reports || []);
      } else if (codingQs.length > 0) {
        // default select first coding question
        window.location.search = `?question=${codingQs[0].id}`;
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch plagiarism details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunPlagiarism = async () => {
    if (!window.confirm('Re-run plagiarism scan? This will clear existing reports and analyze all final submissions for coding tasks.')) {
      return;
    }
    setRunning(true);
    setError('');
    try {
      const res = await client.post(`/api/tests/${testId}/plagiarism/run`);
      alert(res.data.message || 'Detection job scheduled.');
      // Refresh after short timeout
      setTimeout(() => {
        fetchInitialData();
      }, 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to trigger plagiarism analysis.');
    } finally {
      setRunning(false);
    }
  };

  const activeQuestion = questions.find((q) => q.id === questionId);

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>Plagiarism audit report</h1>
          <p>{test ? `Assesment: ${test.title}` : 'Loading...'}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button onClick={handleRunPlagiarism} className="btn btn-primary" disabled={running}>
            {running ? 'Running Scan...' : '🔄 Re-run Scan'}
          </button>
          <Link to={`/admin/tests/${testId}/results`} className="btn btn-secondary">
            Back to Results
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tabs for switching between coding questions */}
      {questions.length > 1 && (
        <div className="tabs animate-fade-in">
          {questions.map((q) => (
            <Link
              key={q.id}
              to={`?question=${q.id}`}
              className={`tab ${q.id === questionId ? 'active' : ''}`}
            >
              {q.title || q.body.slice(0, 30)}
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Analyzing submission fingerprints...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="card empty-state animate-fade-in">
          <div className="empty-state-icon">🛡️</div>
          <h3 className="empty-state-title">No Plagiarism Matches Found</h3>
          <p>
            No candidate code pairs exceed the configured similarity threshold for the question: "
            {activeQuestion?.title || 'Coding task'}"
          </p>
        </div>
      ) : (
        <div className="test-layout animate-fade-in" style={{ gridTemplateColumns: '320px 1fr' }}>
          {/* Left pane: matches list */}
          <div className="test-sidebar card">
            <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
              Flagged Matches
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {reports.map((pair, idx) => {
                const isSelected = selectedPair?.id === pair.id;
                const percent = Math.round(pair.similarity_score * 100);
                return (
                  <button
                    key={pair.id || idx}
                    onClick={() => setSelectedPair(pair)}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span className="badge badge-danger" style={{ fontSize: '0.8rem' }}>
                        {percent}% Match
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {pair.matched_fingerprint_count} grams
                      </span>
                    </div>
                    <div style={{ marginTop: 'var(--space-xs)', width: '100%' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        A: {pair.candidate_a_name}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        B: {pair.candidate_b_name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right pane: side-by-side diff */}
          <div className="test-main card" style={{ overflowY: 'auto' }}>
            {selectedPair ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
                  Code Comparison Side-by-Side
                </h3>
                <CodeDiffViewer
                  codeA={selectedPair.code_a}
                  nameA={selectedPair.candidate_a_name}
                  langA={selectedPair.lang_a}
                  codeB={selectedPair.code_b}
                  nameB={selectedPair.candidate_b_name}
                  langB={selectedPair.lang_b}
                />
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <p className="empty-state-title">Select a Match Pair</p>
                <p>Click on any candidate match pair on the left to inspect side-by-side source code.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
export default PlagiarismReport;
