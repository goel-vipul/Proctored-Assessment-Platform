import React from 'react';

export const MCQQuestion = ({ question, selectedOptionIds = [], onChange }) => {
  const { options, multi_select } = question;

  const handleSelect = (optionId) => {
    if (multi_select) {
      if (selectedOptionIds.includes(optionId)) {
        onChange(selectedOptionIds.filter((id) => id !== optionId));
      } else {
        onChange([...selectedOptionIds, optionId]);
      }
    } else {
      onChange([optionId]);
    }
  };

  return (
    <div className="card" style={{ marginTop: 'var(--space-md)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {options?.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={`btn btn-secondary`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                background: isSelected ? 'var(--accent-primary-glow)' : 'var(--bg-glass)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <input
                type={multi_select ? 'checkbox' : 'radio'}
                checked={isSelected}
                onChange={() => handleSelect(option.id)}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer',
                }}
              />
              <span style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 500 }}>
                {option.text}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
export default MCQQuestion;
