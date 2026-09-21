import React, { useState } from 'react';
import { X, Copy, Download } from 'lucide-react';

export function ExportModal({
  isOpen,
  onClose,
  reviewResult,
  originalCode,
  language
}) {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');

  if (!isOpen) return null;

  const generateMarkdownReport = () => {
    if (!reviewResult) return '# No review available';

    return `# Code Review Report
**Date:** ${new Date().toLocaleDateString()}
**Language:** ${language}
**Health Score:** ${reviewResult.score}/100

## Summary
${reviewResult.summary}

### Health Metrics
- Security: ${reviewResult.metrics?.security}%
- Maintainability: ${reviewResult.metrics?.maintainability}%
- Performance: ${reviewResult.metrics?.performance}%
- Readability: ${reviewResult.metrics?.readability}%

---

## Detailed Findings (${reviewResult.issues?.length || 0} issues)

${(reviewResult.issues || []).map((issue, idx) => `
### ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}
- Category: ${issue.category}
- Line: ${issue.line || 'General'}
- Description: ${issue.description}

\`\`\`${language}
// Problematic code:
${issue.originalSnippet || ''}

// Suggested fix:
${issue.suggestedSnippet || ''}
\`\`\`
> Why: ${issue.explanation || ''}
`).join('\n')}

---

## Refactored Implementation

\`\`\`${language}
${reviewResult.refactoredCode || '// No refactored code'}
\`\`\`

---

## Unit Tests

\`\`\`${language}
${reviewResult.unitTests || '// No unit tests'}
\`\`\`
`;
  };

  const generateJsonReport = () => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      language,
      originalCode,
      review: reviewResult
    }, null, 2);
  };

  const reportContent = exportFormat === 'markdown' ? generateMarkdownReport() : generateJsonReport();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: exportFormat === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-report.${exportFormat === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Export Code Review Report
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Format Selector */}
        <div style={{ padding: '14px 18px 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Format:</span>
          <div className="mode-tabs">
            <button 
              className={`mode-tab ${exportFormat === 'markdown' ? 'active' : ''}`}
              onClick={() => setExportFormat('markdown')}
            >
              Markdown (.md)
            </button>
            <button 
              className={`mode-tab ${exportFormat === 'json' ? 'active' : ''}`}
              onClick={() => setExportFormat('json')}
            >
              JSON (.json)
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div style={{ padding: '14px 18px' }}>
          <textarea
            readOnly
            value={reportContent}
            rows={10}
            style={{
              width: '100%',
              background: '#07090e',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.775rem',
              lineHeight: '1.4',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
          <button className="btn-secondary" onClick={handleCopy}>
            <Copy size={12} />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button className="btn-primary" onClick={handleDownload}>
            <Download size={12} />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
