import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';
import QuestionForm from '../../components/QuestionForm';

export const QuestionEditor = () => {
  const { testId, id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [questionData, setQuestionData] = useState({
    type: 'coding',
    title: '',
    body: '',
    weight: 5,
    allowed_languages: ['python', 'javascript'],
    time_limit_ms: 2000,
    memory_limit_mb: 256,
    options: [
      { id: '1', text: '' },
      { id: '2', text: '' },
    ],
    correct_option_ids: [],
    multi_select: false,
    negative_marking: 0,
    max_length: null,
  });

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const res = await client.get(`/api/tests/${testId}`);
      const matchingQ = res.data.questions?.find((q) => q.id === id);
      if (!matchingQ) {
        throw new Error('Question not found in test.');
      }

      setQuestionData({
        type: matchingQ.type,
        title: matchingQ.title || '',
        body: matchingQ.body,
        weight: parseFloat(matchingQ.weight),
        allowed_languages: matchingQ.allowed_languages || [],
        time_limit_ms: matchingQ.time_limit_ms || 2000,
        memory_limit_mb: matchingQ.memory_limit_mb || 256,
        options: matchingQ.options || [
          { id: '1', text: '' },
          { id: '2', text: '' },
        ],
        correct_option_ids: matchingQ.correct_option_ids || [],
        multi_select: matchingQ.multi_select || false,
        negative_marking: parseFloat(matchingQ.negative_marking || 0),
        max_length: matchingQ.max_length,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load question details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setQuestionData({ ...questionData, [field]: value });
  };

  const handleLanguageToggle = (lang) => {
    const current = questionData.allowed_languages;
    if (current.includes(lang)) {
      handleFieldChange('allowed_languages', current.filter((l) => l !== lang));
    } else {
      handleFieldChange('allowed_languages', [...current, lang]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Extra validation prior to saving
    if (questionData.type === 'mcq') {
      if (questionData.correct_option_ids.length === 0) {
        setError('Please select at least one correct option.');
        return;
      }
      const emptyOption = questionData.options.some((o) => !o.text.trim());
      if (emptyOption) {
        setError('Please fill in text for all options.');
        return;
      }
    }

    setSaving(true);

    try {
      if (isEdit) {
        await client.patch(`/api/questions/${id}`, questionData);
      } else {
        await client.post(`/api/tests/${testId}/questions`, questionData);
      }
      navigate(`/admin/tests/${testId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Modify Question' : 'Add Assessment Question'}</h1>
          <p>Configure question content and scoring metrics</p>
        </div>
        <Link to={`/admin/tests/${testId}`} className="btn btn-secondary">
          Cancel
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Loading question...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card animate-fade-in">
          <QuestionForm
            questionData={questionData}
            onChange={handleFieldChange}
            onLanguageToggle={handleLanguageToggle}
          />

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-md)' }}>
            <Link to={`/admin/tests/${testId}`} className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner"></span> : 'Save Question'}
            </button>
          </div>
        </form>
      )}
    </Layout>
  );
};
export default QuestionEditor;
