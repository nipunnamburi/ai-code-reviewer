import React, { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
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
    setTimeout(() => setCopied(false), 1400);
  };

  const handleApply = () => {
    onApplyRefactor(refactoredCode);
    setApplied(true);
    setTimeout(() => setApplied(false), 1400);
  };

  // Compute line-by-line diff
  const diffParts = Diff.diffLines(originalCode, refactoredCode);

  let lineNumber = 1;

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2">
        <div>
          <div className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wide">
            unified diff · refactor proposal
          </div>
          <div className="text-[11px] text-[var(--color-muted)]">
            deterministic line differences between source buffer and AI remediation.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={handleCopy} 
            className="btn-terminal-secondary text-[11px] py-1 px-2.5"
          >
            {copied ? <Check className="w-3 h-3 text-[var(--color-accent)]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'copied' : 'copy'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleApply} 
            className="btn-terminal-primary text-[11px] py-1 px-3"
          >
            <Check className="w-3 h-3" />
            <span>{applied ? 'applied' : 'apply to editor'}</span>
          </button>
        </div>
      </div>

      {/* Signature Hallmark Terminal Unified Diff Container */}
      <div className="diff-container text-xs">
        <div className="diff-header flex items-center justify-between">
          <div>
            <span className="text-[var(--color-muted)]">--- a/source_buffer.raw</span>
            <br />
            <span className="text-[var(--color-accent)]">+++ b/refactored_buffer.clean</span>
          </div>
          <span className="text-[var(--color-muted)]">@@ -1,len +1,len @@</span>
        </div>

        <div className="p-2 overflow-x-auto max-h-[460px] overflow-y-auto divide-y divide-[var(--color-rule)]">
          {diffParts.map((part, index) => {
            let lineClass = '';
            let marker = ' ';

            if (part.added) {
              lineClass = 'add';
              marker = '+';
            } else if (part.removed) {
              lineClass = 'del';
              marker = '-';
            }

            const lines = part.value.split('\n');
            if (lines[lines.length - 1] === '') lines.pop();

            return (
              <div key={index}>
                {lines.map((line, lIdx) => {
                  const currentLineNum = lineNumber++;
                  return (
                    <div 
                      key={lIdx} 
                      className={`diff-line py-1 ${lineClass}`}
                    >
                      <span className="text-[var(--color-rule-2)] text-right pr-3 select-none text-[11px]">
                        {String(currentLineNum).padStart(2, '0')}
                      </span>
                      <span className={`select-none font-bold ${part.added ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                        {marker}
                      </span>
                      <span className="whitespace-pre overflow-x-auto">
                        {line || ' '}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DiffViewer;
