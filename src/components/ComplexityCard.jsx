import React from 'react';
import { Activity } from 'lucide-react';

export function ComplexityCard({ complexity }) {
  if (!complexity) return null;

  return (
    <div 
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={15} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Complexity & Big-O Analysis
          </span>
        </div>
        <span 
          style={{
            fontSize: '0.675rem',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '4px',
            background: 'var(--accent-primary-subtle)',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(144, 183, 245, 0.25)'
          }}
        >
          DSA Profiler
        </span>
      </div>

      {/* Grid for Time / Space / Target */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {/* Time Complexity */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '8px 10px' }}>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Time Complexity
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: complexity.time?.includes('n²') ? 'var(--semantic-error)' : 'var(--accent-primary)' }}>
            {complexity.time || 'O(n)'}
          </div>
        </div>

        {/* Space Complexity */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '8px 10px' }}>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Space Complexity
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {complexity.space || 'O(1)'}
          </div>
        </div>

        {/* Target Optimal Complexity */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '8px 10px' }}>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
            Target Complexity
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--semantic-success)' }}>
            {complexity.targetComplexity || 'O(n)'}
          </div>
        </div>
      </div>

      {/* Bottleneck & DSA Strategy */}
      {complexity.bottleneck && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Bottleneck: </strong>
          <span>{complexity.bottleneck}</span>
        </div>
      )}

      {complexity.explanation && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
          <strong style={{ color: 'var(--accent-primary)' }}>Optimization: </strong>
          {complexity.explanation}
        </div>
      )}
    </div>
  );
}
