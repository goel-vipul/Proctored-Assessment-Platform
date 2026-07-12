import React from 'react';

export const SubjectiveQuestion = ({ question, value = '', onChange }) => {
  const { max_length } = question;

  const handleChange = (e) => {
    const text = e.target.value;
    if (max_length && text.length > max_length) return;
    onChange(text);
  };

  return (
    <div className="card" style={{ marginTop: 'var(--space-md)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <textarea
          className="form-textarea"
          value={value}
          onChange={handleChange}
          rows="10"
          placeholder="Type your detailed response here..."
          style={{ fontSize: '0.95rem', lineHeight: '1.6' }}
        />
        {max_length && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.8rem',
              color: value.length >= max_length * 0.9 ? 'var(--danger)' : 'var(--text-tertiary)',
              marginTop: 'var(--space-xs)',
              fontWeight: 500,
            }}
          >
            {value.length} / {max_length} characters
          </div>
        )}
      </div>
    </div>
  );
};
export default SubjectiveQuestion;
