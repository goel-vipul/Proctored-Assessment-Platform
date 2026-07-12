import React from 'react';
import Editor from '@monaco-editor/react';

export const MonacoWrapper = ({ value, onChange, language, allowedLanguages, onLanguageChange }) => {
  const languageOptions = {
    cpp: 'cpp',
    java: 'java',
    python: 'python',
    javascript: 'javascript',
  };

  const getLanguageLabel = (lang) => {
    switch (lang) {
      case 'cpp': return 'C++ (g++)';
      case 'java': return 'Java (JDK)';
      case 'python': return 'Python 3';
      case 'javascript': return 'Node.js';
      default: return lang;
    }
  };

  return (
    <div className="monaco-wrapper">
      <div className="monaco-header">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select
            className="form-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            style={{ width: '180px', padding: '6px 12px' }}
          >
            {allowedLanguages?.map((lang) => (
              <option key={lang} value={lang}>
                {getLanguageLabel(lang)}
              </option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          Environment: Sandboxed & Offline
        </span>
      </div>

      <Editor
        height="500px"
        language={languageOptions[language] || 'javascript'}
        theme="vs-dark"
        value={value}
        onChange={onChange}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          fontFamily: 'var(--font-mono)',
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
        }}
      />
    </div>
  );
};
export default MonacoWrapper;
