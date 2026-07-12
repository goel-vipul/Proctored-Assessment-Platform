import React from 'react';

export const TestCaseForm = ({ testCaseData, onChange }) => {
  const { input, expected_output, is_sample } = testCaseData;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="form-group">
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={is_sample || false}
            onChange={(e) => onChange('is_sample', e.target.checked)}
          />
          <span>Mark as Sample (Visible to candidates during test execution)</span>
        </label>
      </div>

      <div className="form-group">
        <label className="form-label">Standard Input (stdin)</label>
        <textarea
          className="form-textarea"
          value={input}
          rows="4"
          placeholder="Test case inputs, one per line..."
          onChange={(e) => onChange('input', e.target.value)}
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Expected Output (stdout)</label>
        <textarea
          className="form-textarea"
          value={expected_output}
          rows="4"
          placeholder="Expected text output format..."
          onChange={(e) => onChange('expected_output', e.target.value)}
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>
    </div>
  );
};
export default TestCaseForm;
