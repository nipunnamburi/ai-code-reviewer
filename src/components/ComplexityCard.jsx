import React from 'react';
import { Activity, Clock, Database, Target } from 'lucide-react';

export function ComplexityCard({ complexity }) {
  if (!complexity) return null;

  return (
    <div className="terminal-well p-4 font-mono">
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span className="font-semibold text-[var(--color-ink)] uppercase tracking-wide">
            big-o & algorithmic complexity
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 border border-[var(--color-rule)] text-[var(--color-accent)]">
          dsa_profiler
        </span>
      </div>

      {/* Figures as Tool's Output Grid */}
      <div className="grid grid-cols-3 border border-[var(--color-rule)] bg-[var(--color-paper)] mb-3">
        <div className="p-3 border-r border-[var(--color-rule)]">
          <div className="figure-output text-xl text-[var(--color-accent)] mb-1">
            {complexity.time || 'O(n)'}
          </div>
          <div className="text-[10.5px] text-[var(--color-muted)]">
            # time complexity
          </div>
        </div>

        <div className="p-3 border-r border-[var(--color-rule)]">
          <div className="figure-output text-xl text-[var(--color-ink)] mb-1">
            {complexity.space || 'O(1)'}
          </div>
          <div className="text-[10.5px] text-[var(--color-muted)]">
            # space complexity
          </div>
        </div>

        <div className="p-3">
          <div className="figure-output text-xl text-[var(--color-accent)] mb-1">
            {complexity.targetComplexity || 'O(n)'}
          </div>
          <div className="text-[10.5px] text-[var(--color-muted)]">
            # target optimal
          </div>
        </div>
      </div>

      {/* Bottleneck description */}
      {complexity.bottleneck && (
        <div className="text-xs p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule)] mb-2">
          <span className="text-[var(--color-accent)] font-semibold mr-1.5">[BOTTLENECK]:</span>
          <span className="text-[var(--color-ink-2)]">{complexity.bottleneck}</span>
        </div>
      )}

      {/* Optimization path */}
      {complexity.explanation && (
        <div className="text-xs p-2.5 bg-[var(--color-accent-wash)] border border-[var(--color-accent)] text-[var(--color-ink)]">
          <span className="text-[var(--color-accent)] font-semibold mr-1.5">[OPTIMIZATION]:</span>
          <span>{complexity.explanation}</span>
        </div>
      )}
    </div>
  );
}

export default ComplexityCard;
