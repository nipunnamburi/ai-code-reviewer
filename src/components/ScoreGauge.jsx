import React from 'react';

export function ScoreGauge({ score = 0, metrics = {}, summary = '' }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (val) => {
    if (val >= 80) return 'var(--semantic-success)';
    if (val >= 60) return 'var(--semantic-warning)';
    return 'var(--semantic-error)';
  };

  const getScoreLabel = (val) => {
    if (val >= 85) return 'Production Ready';
    if (val >= 70) return 'Acceptable Quality';
    if (val >= 50) return 'Needs Work';
    return 'Critical Flaws';
  };

  const scoreColor = getScoreColor(score);

  const metricList = [
    { label: 'Security', value: metrics.security ?? 80 },
    { label: 'Performance', value: metrics.performance ?? 75 },
    { label: 'Maintainability', value: metrics.maintainability ?? 80 },
    { label: 'Readability', value: metrics.readability ?? 85 },
  ];

  return (
    <div className="score-card">
      {/* Left: Score Gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="score-ring-container">
          <svg className="score-svg" width="76" height="76">
            <circle
              cx="38"
              cy="38"
              r={radius}
              stroke="var(--bg-surface)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="38"
              cy="38"
              r={radius}
              stroke={scoreColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="score-value" style={{ color: scoreColor }}>
            {score}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span 
              style={{ 
                fontSize: '0.675rem', 
                fontWeight: 600, 
                color: scoreColor, 
                textTransform: 'uppercase'
              }}
            >
              {getScoreLabel(score)}
            </span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Code Health Score
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '260px', marginTop: '2px', lineHeight: 1.4 }}>
            {summary || 'Review evaluated across security, maintainability, and complexity.'}
          </div>
        </div>
      </div>

      {/* Right: Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
        {metricList.map((m) => (
          <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.value}%</span>
            </div>
            <div className="progress-track">
              <div 
                className="progress-fill"
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
