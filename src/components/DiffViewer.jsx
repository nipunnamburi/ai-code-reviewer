import React, { useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import * as Diff from 'diff';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex flex-col gap-3 h-full">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground tracking-tight">
            Refactor & Modernization Diff
          </div>
          <div className="text-xs text-muted-foreground">
            Side-by-side or line diff of current code vs AI-proposed clean implementation.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5">
            <Copy className="size-3" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>

          <Button size="sm" onClick={handleApply} className="h-7 text-xs gap-1.5 shadow-sm">
            <Sparkles className="size-3" />
            <span>{applied ? 'Applied' : 'Apply to Editor'}</span>
          </Button>
        </div>
      </div>

      {/* Diff Content Box */}
      <div className="rounded-lg border border-border/50 bg-[#07090e] p-3 font-mono text-xs leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto">
        {diffParts.map((part, index) => {
          let bg = 'transparent';
          let color = 'text-muted-foreground';
          let prefix = ' ';

          if (part.added) {
            bg = 'bg-emerald-500/10';
            color = 'text-emerald-300';
            prefix = '+';
          } else if (part.removed) {
            bg = 'bg-rose-500/10';
            color = 'text-rose-300';
            prefix = '-';
          }

          const lines = part.value.split('\n');
          if (lines[lines.length - 1] === '') lines.pop();

          return (
            <div key={index} className={bg}>
              {lines.map((line, lIdx) => (
                <div 
                  key={lIdx} 
                  className={`flex px-1.5 py-0.5 whitespace-pre font-mono ${color}`}
                >
                  <span className="w-5 select-none opacity-40 font-mono text-[11px]">{prefix}</span>
                  <span className="flex-1">{line}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
