import React, { useState } from 'react';
import { X } from 'lucide-react';

export function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  customPrompt,
  onSaveCustomPrompt
}) {
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [promptInput, setPromptInput] = useState(customPrompt || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    onSaveCustomPrompt(promptInput.trim());
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    onSaveApiKey('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            API & Engine Configuration
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
              OpenAI API Key
            </label>
            <input 
              type="password"
              placeholder="sk-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                outline: 'none'
              }}
            />
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Stored locally in browser localStorage or loaded from server-side .env file.
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Custom Review Guidelines
            </label>
            <textarea 
              rows={3}
              placeholder="e.g. Focus on strict PEP-8 compliance, memory optimizations..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8125rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
          {keyInput ? (
            <button className="btn-secondary" onClick={handleClear} style={{ color: 'var(--semantic-error)' }}>
              Clear Key
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
