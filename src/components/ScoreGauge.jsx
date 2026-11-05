import React from 'react';
import { ShieldCheck, Zap, Wrench, BookOpen } from 'lucide-react';

export function ScoreGauge({ score = 0, metrics = {}, summary = '' }) {
  const getScoreBadge = (val) => {
    if (val >= 85) return { label: 'nominal (pass)', cls: 'text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent-wash)]' };
    if (val >= 70) return { label: 'acceptable', cls: 'text-[var(--color-ink)] border-[var(--color-rule-2)]' };
    if (val >= 50) return { label: 'warning (flaws)', cls: 'text-[var(--color-ink-2)] border-[var(--color-rule-2)]' };
    return { label: 'critical (fail)', cls: 'text-[var(--color-muted)] border-[var(--color-rule-2)]' };
  };

  const badgeInfo = getScoreBadge(score);

  const metricList = [
    { label: 'security', value: metrics.security ?? 80 },
    { label: 'performance', value: metrics.performance ?? 75 },
    { label: 'maintainability', value: metrics.maintainability ?? 80 },
    { label: 'readability', value: metrics.readability ?? 85 },
  ];

  return (
    <div className="terminal-well p-4 font-mono">
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
        {/* Left: Score Output */}
        <div className="flex items-center gap-4">
          <div className="border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 text-center min-w-[80px]">
            <div className="figure-output text-3xl text-[var(--color-accent)]">
              {score}
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">
              / 100
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10.5px] uppercase font-bold px-2 py-0.5 border ${badgeInfo.cls}`}>
                {badgeInfo.label}
              </span>
            </div>
            <div className="text-xs font-semibold text-[var(--color-ink)]">
              // code health score · deterministic penalty
            </div>
            <div className="text-[11px] text-[var(--color-muted)] max-w-sm leading-relaxed">
              {summary || 'Static AST analysis combined with deep LLM verification.'}
            </div>
          </div>
        </div>

        {/* Right: Dimension Bars (Terminal Style) */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-[var(--color-rule)] md:pl-4 min-w-[240px]">
          {metricList.map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-[var(--color-muted)]">{m.label}</span>
                <span className="font-semibold text-[var(--color-ink)]">{m.value}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-paper)] border border-[var(--color-rule)] overflow-hidden">
                <div 
                  className="h-full bg-[var(--color-accent)] transition-all duration-300"
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ScoreGauge;
