import React from 'react';

export const CodeDiffViewer = ({ codeA, nameA, langA, codeB, nameB, langB }) => {
  return (
    <div className="diff-viewer">
      <div className="diff-pane">
        <div className="diff-pane-header">
          <span>{nameA} ({langA?.toUpperCase()})</span>
        </div>
        <pre><code>{codeA}</code></pre>
      </div>

      <div className="diff-pane">
        <div className="diff-pane-header">
          <span>{nameB} ({langB?.toUpperCase()})</span>
        </div>
        <pre><code>{codeB}</code></pre>
      </div>
    </div>
  );
};
export default CodeDiffViewer;
