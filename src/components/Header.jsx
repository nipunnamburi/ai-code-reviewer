import React from 'react';
import { 
  Code2, 
  KeyRound, 
  GitPullRequest, 
  FolderDown,
  Layers,
  Server
} from 'lucide-react';
import { AI_MODELS } from '../services/aiService';

export function Header({
  selectedModel,
  onSelectModel,
  apiKey,
  onOpenApiKeyModal,
  onOpenExportModal,
  onOpenPrModal,
  onSelectSample,
  samples = [],
  isReviewing,
  backendOnline
}) {
  const hasCustomKey = Boolean(apiKey && apiKey.trim().startsWith('sk-'));

  return (
    <header className="header-container">
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div 
          style={{ 
            width: '30px', 
            height: '30px', 
            borderRadius: '6px', 
            background: 'var(--accent-primary-subtle)',
            border: '1px solid rgba(144, 183, 245, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Code2 size={16} color="var(--accent-primary)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              AI Code Review Assistant
            </span>
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
              Hybrid Static + AI
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons & Selectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Backend Status indicator */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.75rem', 
            padding: '4px 8px', 
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            color: backendOnline ? 'var(--semantic-success)' : 'var(--semantic-warning)'
          }}
          title={backendOnline ? "FastAPI backend active" : "Connecting to backend..."}
        >
          <Server size={12} />
          <span>{backendOnline ? 'FastAPI' : 'Connecting'}</span>
        </div>

        {/* Sample Templates Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select 
            className="select-custom"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onSelectSample(e.target.value);
                e.target.value = '';
              }
            }}
            aria-label="Load Sample Snippet"
          >
            <option value="" disabled>Load Sample...</option>
            {samples.map(sample => (
              <option key={sample.id} value={sample.id}>
                {sample.title}
              </option>
            ))}
          </select>
        </div>

        {/* GitHub PR Import Button */}
        <button 
          className="btn-secondary"
          onClick={onOpenPrModal}
        >
          <GitPullRequest size={13} />
          <span>Import PR</span>
        </button>

        {/* Model Selector */}
        <select 
          className="select-custom"
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          aria-label="Select AI Model"
        >
          {AI_MODELS.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* API Key Modal Trigger */}
        <button 
          className="btn-secondary"
          onClick={onOpenApiKeyModal}
        >
          <KeyRound size={13} />
          <span>{hasCustomKey ? 'API Key Set' : 'Settings'}</span>
        </button>

        {/* Export Report */}
        <button 
          className="btn-secondary"
          onClick={onOpenExportModal}
        >
          <FolderDown size={13} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
