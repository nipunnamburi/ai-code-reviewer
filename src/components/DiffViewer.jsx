import React, { useState } from 'react';
import { Check, Copy, Sparkles, CheckCheck } from 'lucide-react';
import * as Diff from 'diff';

export function DiffViewer({
  originalCode = '',
  refactoredCode = '',
  onApplyRefactor
}) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(refactoredCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    onApplyRefactor(refactoredCode);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  // Compute line-by-line diff
  const diffParts = Diff.diffLines(originalCode, refactoredCode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      {/* Diff Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Refactor & Modernization Diff
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
            Line diff of original code vs AI-optimized proposal.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button className="btn-secondary" onClick={handleCopy}>
            <Copy size={12} />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button className="btn-primary" onClick={handleApply}>
            <Sparkles size={12} />
            <span>{applied ? 'Applied' : 'Apply to Editor'}</span>
          </button>
        </div>
      </div>

      {/* Diff Content Box */}
      <div 
        style={{ 
          background: '#07090e', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: '6px', 
          padding: '10px', 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.775rem', 
          lineHeight: '1.5', 
          overflowX: 'auto',
          maxHeight: '460px',
          overflowY: 'auto'
        }}
      >
        {diffParts.map((part, index) => {
          let bg = 'transparent';
          let color = 'var(--text-muted)';
          let prefix = ' ';

          if (part.added) {
            bg = 'rgba(16, 185, 129, 0.1)';
            color = '#86efac';
            prefix = '+';
          } else if (part.removed) {
            bg = 'rgba(239, 68, 68, 0.1)';
            color = '#fca5a5';
            prefix = '-';
          }

          const lines = part.value.split('\n');
          if (lines[lines.length - 1] === '') lines.pop();

          return (
            <div key={index} style={{ backgroundColor: bg }}>
              {lines.map((line, lIdx) => (
                <div 
                  key={lIdx} 
                  style={{ 
                    display: 'flex', 
                    color: color,
                    padding: '1px 4px',
                    whiteSpace: 'pre'
                  }}
                >
                  <span style={{ width: '16px', userSelect: 'none', opacity: 0.6 }}>{prefix}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
