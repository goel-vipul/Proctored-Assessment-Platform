import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useProctoring } from '../../hooks/useProctoring';
import { useTestTimer } from '../../hooks/useTestTimer';
import { useAutosave } from '../../hooks/useAutosave';
import Timer from '../../components/Timer';
import QuestionNav from '../../components/QuestionNav';
import MonacoWrapper from '../../components/MonacoWrapper';
import MCQQuestion from '../../components/MCQQuestion';
import SubjectiveQuestion from '../../components/SubjectiveQuestion';

export const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> answer Object
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Code editor states
  const [codeValue, setCodeValue] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [runningCode, setRunningCode] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const token = localStorage.getItem('accessToken');
  const socket = useWebSocket(import.meta.env.VITE_WS_URL || '', token);

  // Initialize session and socket joining
  useEffect(() => {
    startOrResumeSession();
  }, [testId]);

  const startOrResumeSession = async () => {
    try {
      const res = await client.post(`/api/candidate/tests/${testId}/start`);
      const { session: sess, questions: qs, answers: ansList } = res.data;

      setSession(sess);
      setQuestions(qs);

      // Map answers list to state
      const ansMap = {};
      ansList.forEach((a) => {
        ansMap[a.question_id] = {
          selectedOptionIds: a.selected_option_ids || [],
          textAnswer: a.text_answer || '',
        };
      });
      setAnswers(ansMap);

      // Load initial coding question configuration if selected
      const currentQ = qs[0];
      if (currentQ?.type === 'coding') {
        setSelectedLanguage(currentQ.allowed_languages[0] || 'python');
        setCodeValue(ansMap[currentQ.id]?.textAnswer || '');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to start the assessment.');
    } finally {
      setLoading(false);
    }
  };

  // Join WS Session Room
  useEffect(() => {
    if (socket && session) {
      socket.emit('join_session', { sessionId: session.id });

      // Handle server forced expiration
      socket.on('session:expired', () => {
        alert('Your session timer has expired. Auto-submitting the test.');
        handleForceSubmit();
      });

      // Handle async code execution result updates
      socket.on('submission:result', (result) => {
        console.log('Submission result received via WebSocket:', result);
        setRunningCode(false);
        setSubmittingCode(false);
        setRunResult(result);
      });
    }

    return () => {
      if (socket) {
        socket.off('session:expired');
        socket.off('submission:result');
      }
    };
  }, [socket, session]);

  // Activate Proctoring listeners (tab switch tracking)
  useProctoring(socket, session?.id);

  // Timer Setup (Sync with hardEndAt)
  const handleForceSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await client.post(`/api/candidate/sessions/${session.id}/submit`);
      navigate('/candidate/tests');
    } catch (err) {
      console.error(err);
      navigate('/candidate/tests');
    }
  };

  const { formattedTime, isLowTime, isCriticalTime } = useTestTimer(
    session?.hard_end_at,
    handleForceSubmit
  );

  // Debounced Autosave Callback
  const saveAnswerToApi = async (qId, ansData) => {
    if (!session) return;
    try {
      await client.put(`/api/candidate/sessions/${session.id}/answers/${qId}`, {
        selectedOptionIds: ansData.selectedOptionIds,
        textAnswer: ansData.textAnswer,
      });
    } catch (err) {
      console.warn('Autosave failed:', err.message);
    }
  };

  const debouncedAutosave = useAutosave(saveAnswerToApi, 2000);

  // Handle Input Changes & Autosave Trigger
  const handleAnswerChange = (qId, field, value) => {
    const updatedAnswer = {
      ...(answers[qId] || { selectedOptionIds: [], textAnswer: '' }),
      [field]: value,
    };

    setAnswers((prev) => ({
      ...prev,
      [qId]: updatedAnswer,
    }));

    // Trigger debounced save to backend
    debouncedAutosave(qId, updatedAnswer);
  };

  // Adjust Code editor state when moving questions
  const handleQuestionSelect = (index) => {
    setCurrentIndex(index);
    setRunResult(null);

    const nextQ = questions[index];
    if (nextQ.type === 'coding') {
      setSelectedLanguage(nextQ.allowed_languages[0] || 'python');
      setCodeValue(answers[nextQ.id]?.textAnswer || '');
    }
  };

  const currentQuestion = questions[currentIndex];

  // Submit whole test manually
  const handleManualSubmit = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to finish and submit your test? No changes will be accepted after submission.'
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await client.post(`/api/candidate/sessions/${session.id}/submit`);
      alert('Test submitted successfully. Thank you!');
      navigate('/candidate/tests');
    } catch (err) {
      console.error(err);
      setError('Failed to submit test. Try again.');
      setSubmitting(false);
    }
  };

  // Run code against Sample Test Cases
  const handleRunCode = async () => {
    if (!currentQuestion) return;
    setRunningCode(true);
    setRunResult(null);

    // Sync answer state first
    handleAnswerChange(currentQuestion.id, 'textAnswer', codeValue);

    try {
      await client.post('/api/submissions', {
        sessionId: session.id,
        questionId: currentQuestion.id,
        language: selectedLanguage,
        code: codeValue,
        kind: 'run', // run sample test cases
      });
      // Response is 202. Wait for WS event.
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit run job.');
      setRunningCode(false);
    }
  };

  // Submit code against all (Sample + Hidden) Test Cases
  const handleSubmitCode = async () => {
    if (!currentQuestion) return;
    setSubmittingCode(true);
    setRunResult(null);

    // Sync answer state
    handleAnswerChange(currentQuestion.id, 'textAnswer', codeValue);

    try {
      await client.post('/api/submissions', {
        sessionId: session.id,
        questionId: currentQuestion.id,
        language: selectedLanguage,
        code: codeValue,
        kind: 'submit', // evaluate full scoring
      });
      // Response is 202. Wait for WS event.
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit code job.');
      setSubmittingCode(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Test Taking Header */}
      <header
        className="navbar"
        style={{
          height: '70px',
          padding: '0 var(--space-xl)',
          background: 'rgba(17, 24, 39, 0.95)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          Assessment: {questions[0]?.test_title || 'Technical Test'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Timer
            formattedTime={formattedTime}
            isLowTime={isLowTime}
            isCriticalTime={isCriticalTime}
          />
          <button onClick={handleManualSubmit} className="btn btn-success" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Finish & Submit Test'}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      {loading ? (
        <div className="loading-overlay" style={{ height: 'calc(100vh - 70px)' }}>
          <div className="loading-spinner lg"></div>
          <p>Preparing workspace containers...</p>
        </div>
      ) : error ? (
        <div style={{ padding: 'var(--space-2xl)', maxWidth: '600px', margin: '0 auto' }}>
          <div className="alert alert-danger">{error}</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            height: 'calc(100vh - 70px)',
            overflow: 'hidden',
          }}
        >
          {/* Question Nav Sidebar */}
          <aside
            style={{
              background: 'rgba(10, 14, 26, 0.5)',
              borderRight: '1px solid var(--border-primary)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              overflowY: 'auto',
            }}
          >
            <h3>Questions</h3>
            <QuestionNav
              questions={questions}
              currentIndex={currentIndex}
              answeredQuestionIds={Object.keys(answers)}
              onSelect={handleQuestionSelect}
            />

            <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-tertiary)', background: 'var(--bg-glass)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)' }}>
              🔒 Proctored Environment active. Leaving this window will flag your session.
            </div>
          </aside>

          {/* Question Main Workspace */}
          <main
            style={{
              padding: 'var(--space-lg)',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateRows: 'auto 1fr',
              gap: 'var(--space-md)',
            }}
          >
            {currentQuestion ? (
              <>
                {/* Question Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2>
                      Q{currentIndex + 1}. {currentQuestion.title || 'Solve Problem'}
                    </h2>
                    <span className="badge badge-accent" style={{ marginTop: 'var(--space-xs)' }}>
                      Weight: {currentQuestion.weight} Points
                    </span>
                  </div>
                </div>

                {/* Problem Statement Body */}
                <div
                  style={{
                    background: 'var(--bg-glass)',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.95rem',
                  }}
                >
                  {currentQuestion.body}
                </div>

                {/* Question Type Workspace renders */}
                {currentQuestion.type === 'coding' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <MonacoWrapper
                      value={codeValue}
                      onChange={(val) => {
                        setCodeValue(val);
                        handleAnswerChange(currentQuestion.id, 'textAnswer', val);
                      }}
                      language={selectedLanguage}
                      allowedLanguages={currentQuestion.allowed_languages}
                      onLanguageChange={(lang) => {
                        setSelectedLanguage(lang);
                      }}
                    />

                    {/* Run buttons */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                      <button onClick={handleRunCode} className="btn btn-secondary" disabled={runningCode || submittingCode}>
                        {runningCode ? 'Executing Sandbox...' : 'Run Samples'}
                      </button>
                      <button onClick={handleSubmitCode} className="btn btn-primary" disabled={runningCode || submittingCode}>
                        {submittingCode ? 'Submitting Code...' : 'Submit Answer'}
                      </button>
                    </div>

                    {/* Code execution results display */}
                    {runResult && (
                      <div
                        className="card"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: runResult.verdict === 'accepted' ? '1px solid var(--success)' : '1px solid var(--border-primary)',
                        }}
                      >
                        <h4 style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                          <span>Execution Results</span>
                          <span className={`badge verdict-${runResult.verdict}`}>
                            {runResult.verdict?.toUpperCase()?.replace('_', ' ')}
                          </span>
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                          {runResult.perTestCase?.map((tc, idx) => (
                            <div
                              key={tc.testCaseId || idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                background: 'var(--bg-glass)',
                                padding: 'var(--space-sm)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.85rem',
                              }}
                            >
                              <span>Test Case #{idx + 1} ({tc.isSample ? 'Sample' : 'Hidden'})</span>
                              <span style={{ color: tc.verdict === 'accepted' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                {tc.verdict?.toUpperCase()?.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentQuestion.type === 'mcq' && (
                  <MCQQuestion
                    question={currentQuestion}
                    selectedOptionIds={answers[currentQuestion.id]?.selectedOptionIds || []}
                    onChange={(ids) => handleAnswerChange(currentQuestion.id, 'selectedOptionIds', ids)}
                  />
                )}

                {currentQuestion.type === 'subjective' && (
                  <SubjectiveQuestion
                    question={currentQuestion}
                    value={answers[currentQuestion.id]?.textAnswer || ''}
                    onChange={(val) => handleAnswerChange(currentQuestion.id, 'textAnswer', val)}
                  />
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>Question not found.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
};
export default TakeTest;
