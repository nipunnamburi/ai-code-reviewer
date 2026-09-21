import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { importGitHubPR } from '../services/apiClient';

export function GitHubPrModal({
  isOpen,
  onClose,
  onLoadPRCode
}) {
  const [prUrl, setPrUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prData, setPrData] = useState(null);

  if (!isOpen) return null;

  const handleFetch = async () => {
    if (!prUrl.trim()) return;
    setLoading(true);
    setError('');
    setPrData(null);

    try {
      const data = await importGitHubPR(prUrl.trim());
      setPrData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Pull Request');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = (file) => {
    const codeToReview = file.patch || `// File: ${file.filename}\n// Additions: +${file.additions} | Deletions: -${file.deletions}\n\n${file.patch || '// Full file content'}`;
    
    let detectedLang = 'javascript';
    const ext = file.filename.split('.').pop()?.toLowerCase();
    if (ext === 'py') detectedLang = 'python';
    else if (ext === 'ts' || ext === 'tsx') detectedLang = 'typescript';
    else if (ext === 'cpp' || ext === 'c') detectedLang = 'cpp';
    else if (ext === 'go') detectedLang = 'go';
    else if (ext === 'rs') detectedLang = 'rust';

    onLoadPRCode(codeToReview, detectedLang);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Import GitHub Pull Request
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Pull Request URL
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text"
                placeholder="https://github.com/fastapi/fastapi/pull/12345"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  outline: 'none'
                }}
              />
              <button 
                className="btn-primary" 
                onClick={handleFetch}
                disabled={loading || !prUrl.trim()}
              >
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--semantic-error-subtle)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--semantic-error)' }}>
              {error}
            </div>
          )}

          {prData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {prData.files.length} changed file(s) in {prData.owner}/{prData.repo} #{prData.pr_number}:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {prData.files.map((file, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectFile(file)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}>{file.filename}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--semantic-success)' }}>+{file.additions}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--semantic-error)' }}>-{file.deletions}</span>
                      <ArrowRight size={12} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
