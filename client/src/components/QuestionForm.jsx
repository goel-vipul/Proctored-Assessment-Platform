import React from 'react';

export const QuestionForm = ({ questionData, onChange, onLanguageToggle }) => {
  const {
    type,
    title,
    body,
    weight,
    allowed_languages = [],
    time_limit_ms,
    memory_limit_mb,
    multi_select,
    negative_marking,
    max_length,
    options = [],
  } = questionData;

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...options];
    updatedOptions[index] = { ...updatedOptions[index], text: value };
    onChange('options', updatedOptions);
  };

  const handleAddOption = () => {
    if (options.length >= 6) return;
    const newId = String(options.length + 1);
    onChange('options', [...options, { id: newId, text: '' }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    const updatedOptions = options.filter((_, i) => i !== index);
    onChange('options', updatedOptions);

    // Also adjust correct option IDs if needed
    const currentCorrect = questionData.correct_option_ids || [];
    const removedId = options[index].id;
    onChange('correct_option_ids', currentCorrect.filter((id) => id !== removedId));
  };

  const handleCorrectOptionToggle = (optionId) => {
    const currentCorrect = questionData.correct_option_ids || [];
    if (multi_select) {
      if (currentCorrect.includes(optionId)) {
        onChange('correct_option_ids', currentCorrect.filter((id) => id !== optionId));
      } else {
        onChange('correct_option_ids', [...currentCorrect, optionId]);
      }
    } else {
      onChange('correct_option_ids', [optionId]);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Question Type</label>
          <select
            className="form-select"
            value={type}
            onChange={(e) => onChange('type', e.target.value)}
          >
            <option value="coding">Coding Problem</option>
            <option value="mcq">Multiple Choice Question (MCQ)</option>
            <option value="subjective">Subjective Question</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Score Weight</label>
          <input
            type="number"
            className="form-input"
            value={weight}
            onChange={(e) => onChange('weight', parseFloat(e.target.value) || 0)}
            min="1"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Question Title (Optional)</label>
        <input
          type="text"
          className="form-input"
          value={title || ''}
          placeholder="e.g. Find First Missing Positive Integer"
          onChange={(e) => onChange('title', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Problem Body / Question Text (Markdown Supported)</label>
        <textarea
          className="form-textarea"
          value={body}
          rows="6"
          placeholder="Describe the question task, rules, and examples..."
          onChange={(e) => onChange('body', e.target.value)}
        />
      </div>

      {/* --- CODING CONFIGURATION --- */}
      {type === 'coding' && (
        <fieldset style={{ border: '1px solid var(--border-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
          <legend style={{ padding: '0 var(--space-sm)', fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: '600' }}>
            Coding Environment Settings
          </legend>
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>Allowed Languages</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {['cpp', 'java', 'python', 'javascript'].map((lang) => (
                <label key={lang} className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={allowed_languages.includes(lang)}
                    onChange={() => onLanguageToggle(lang)}
                  />
                  <span style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>{lang}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Execution Time Limit (ms)</label>
              <input
                type="number"
                className="form-input"
                value={time_limit_ms || 2000}
                onChange={(e) => onChange('time_limit_ms', parseInt(e.target.value, 10) || 2000)}
                step="500"
                min="500"
                max="10000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Memory Limit (MB)</label>
              <input
                type="number"
                className="form-input"
                value={memory_limit_mb || 256}
                onChange={(e) => onChange('memory_limit_mb', parseInt(e.target.value, 10) || 256)}
                step="64"
                min="64"
                max="1024"
              />
            </div>
          </div>
        </fieldset>
      )}

      {/* --- MCQ CONFIGURATION --- */}
      {type === 'mcq' && (
        <fieldset style={{ border: '1px solid var(--border-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
          <legend style={{ padding: '0 var(--space-sm)', fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: '600' }}>
            MCQ Options & Answers
          </legend>

          <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={multi_select || false}
                  onChange={(e) => {
                    onChange('multi_select', e.target.checked);
                    onChange('correct_option_ids', []); // Reset corrects
                  }}
                />
                <span>Allow Multi-Select Checkboxes (Multiple Answers)</span>
              </label>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Negative Marking Penalty (0 if none)</label>
              <input
                type="number"
                className="form-input"
                value={negative_marking || 0}
                onChange={(e) => onChange('negative_marking', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.25"
                style={{ padding: '6px 12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {options.map((option, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <input
                  type={multi_select ? 'checkbox' : 'radio'}
                  name="correct-option"
                  checked={(questionData.correct_option_ids || []).includes(option.id)}
                  onChange={() => handleCorrectOptionToggle(option.id)}
                  title="Mark as correct answer"
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={option.text}
                  placeholder={`Option ${index + 1}`}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() => handleRemoveOption(index)}
                    title="Delete Option"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 6 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddOption}
              style={{ marginTop: 'var(--space-md)' }}
            >
              + Add Option
            </button>
          )}
        </fieldset>
      )}

      {/* --- SUBJECTIVE CONFIGURATION --- */}
      {type === 'subjective' && (
        <fieldset style={{ border: '1px solid var(--border-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
          <legend style={{ padding: '0 var(--space-sm)', fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: '600' }}>
            Answer Constraints
          </legend>
          <div className="form-group">
            <label className="form-label">Maximum Character Limit (Leave blank for no limit)</label>
            <input
              type="number"
              className="form-input"
              value={max_length || ''}
              placeholder="e.g. 1000 characters"
              onChange={(e) => onChange('max_length', parseInt(e.target.value, 10) || null)}
              min="10"
            />
          </div>
        </fieldset>
      )}
    </div>
  );
};
export default QuestionForm;
