import React from 'react';
import { 
  Terminal, 
  KeyRound, 
  GitPullRequest, 
  FolderDown,
  Server,
  Sparkles,
  Layers,
  Users
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
  backendOnline,
  activeView,
  onChangeView,
  crdtTransactions = 1
}) {
  const hasCustomKey = Boolean(apiKey && apiKey.trim().startsWith('sk-'));

  const VIEWS = [
    { id: 'editor', num: '1', label: 'editor' },
    { id: 'diff', num: '2', label: 'diff' },
    { id: 'tests', num: '3', label: 'tests' },
    { id: 'complexity', num: '4', label: 'big-o' }
  ];

  return (
    <header className="status-header">
      {/* Left: Multiplexer Session + Numbered Windows */}
      <div className="flex items-stretch overflow-x-auto scrollbar-none">
        {/* Session Badge */}
        <div className="flex items-center px-3 bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-bold text-xs flex-shrink-0">
          [0:REVIEWER]
        </div>

        {/* Numbered Views */}
        <nav className="flex items-stretch flex-shrink-0" aria-label="Multiplexer tabs">
          {VIEWS.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeView && onChangeView(tab.id)}
                className={`flex items-center px-3 border-r border-[var(--color-rule)] text-xs transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--color-paper-3)] text-[var(--color-ink)] font-semibold shadow-[inset_0_-2px_0_var(--color-accent)]"
                    : "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
                }`}
              >
                <span className="text-[var(--color-muted)] mr-1">{tab.num}:</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: Controls & Diagnostics */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* CRDT Awareness Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 border border-[var(--color-rule)] text-[11px] text-[var(--color-muted)]">
          <Layers className="w-3 h-3 text-[var(--color-accent)]" />
          <span>crdt: tx_{crdtTransactions}</span>
        </div>

        {/* Backend Status indicator */}
        <div 
          className={`flex items-center gap-1.5 px-2 py-0.5 text-[11px] border ${
            backendOnline 
              ? 'text-[var(--color-accent)] border-[var(--color-accent)] bg-[var(--color-accent-wash)]' 
              : 'text-[var(--color-muted)] border-[var(--color-rule)]'
          }`}
          title={backendOnline ? "FastAPI backend active" : "Connecting to backend..."}
        >
          <span className={`w-1.5 h-1.5 ${backendOnline ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-muted)]'}`} />
          <span>{backendOnline ? 'fastapi :8000' : 'offline'}</span>
        </div>

        {/* Sample Templates Dropdown */}
        <select 
          className="h-7 bg-[var(--color-paper)] border border-[var(--color-rule-2)] px-2 text-[11px] text-[var(--color-ink)] focus:outline-none cursor-pointer"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onSelectSample(e.target.value);
              e.target.value = '';
            }
          }}
          aria-label="Load Sample Snippet"
        >
          <option value="" disabled className="bg-[var(--color-paper-2)] text-[var(--color-muted)]">load sample...</option>
          {samples.map(sample => (
            <option key={sample.id} value={sample.id} className="bg-[var(--color-paper-2)] text-[var(--color-ink)]">
              {sample.title}
            </option>
          ))}
        </select>

        {/* GitHub PR Import Button */}
        <button 
          type="button"
          className="btn-terminal-secondary text-[11px] py-1 px-2.5"
          onClick={onOpenPrModal}
        >
          <GitPullRequest className="w-3 h-3 text-[var(--color-muted)]" />
          <span>import pr</span>
        </button>

        {/* Model Selector */}
        <select 
          className="h-7 bg-[var(--color-paper)] border border-[var(--color-rule-2)] px-2 text-[11px] text-[var(--color-ink)] focus:outline-none cursor-pointer"
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          aria-label="Select AI Model"
        >
          {Object.entries(AI_MODELS).map(([key, name]) => (
            <option key={key} value={key} className="bg-[var(--color-paper-2)] text-[var(--color-ink)]">
              {name}
            </option>
          ))}
        </select>

        {/* API Key settings button */}
        <button 
          type="button"
          onClick={onOpenApiKeyModal}
          className={`btn-terminal-secondary text-[11px] py-1 px-2 ${
            hasCustomKey ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : ''
          }`}
          title={hasCustomKey ? 'Custom OpenAI Key Configured' : 'Configure API Key'}
        >
          <KeyRound className="w-3 h-3" />
          <span>{hasCustomKey ? 'key: set' : 'key'}</span>
        </button>

        {/* Export Report */}
        <button 
          type="button"
          className="btn-terminal-secondary text-[11px] py-1 px-2"
          onClick={onOpenExportModal}
          title="Export Review as Markdown or JSON"
        >
          <FolderDown className="w-3 h-3" />
          <span>export</span>
        </button>

        {/* Exit Code / Status */}
        <div className="hidden sm:flex items-center text-[11px] text-[var(--color-accent)] font-semibold pl-1">
          exit 0
        </div>
      </div>
    </header>
  );
}
