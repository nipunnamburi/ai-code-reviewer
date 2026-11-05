import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { 
  Folder, 
  FileCode, 
  Terminal, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  HardDrive, 
  Users, 
  Check, 
  ShieldCheck, 
  Activity, 
  Plus,
  GitPullRequest
} from 'lucide-react';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { ReviewPanel } from './components/ReviewPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ExportModal } from './components/ExportModal';
import { GitHubPrModal } from './components/GitHubPrModal';
import { SAMPLE_SNIPPETS } from './data/sampleSnippets';
import { REVIEW_MODES } from './services/aiService';
import { requestReview, checkBackendHealth, executeTests } from './services/apiClient';

export function App() {
  const [code, setCode] = useState(SAMPLE_SNIPPETS[0].code);
  const [language, setLanguage] = useState(SAMPLE_SNIPPETS[0].language);
  const [activeSnippetId, setActiveSnippetId] = useState(SAMPLE_SNIPPETS[0].id);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [reviewMode, setReviewMode] = useState(REVIEW_MODES.COMPREHENSIVE);
  const [activeTab, setActiveTab] = useState(REVIEW_MODES.COMPREHENSIVE);
  const [activeView, setActiveView] = useState('editor');

  // Sidebar toggle (Obsidian-Code Activity Bar)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Bottom Panel Drawer (Obsidian-Code BottomPanel Runner)
  const [isBottomOpen, setIsBottomOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('runner'); // 'runner' | 'pytest' | 'crdt' | 'man'
  const [runnerLogs, setRunnerLogs] = useState([]);

  // Backend health status
  const [backendOnline, setBackendOnline] = useState(false);

  // API Key & Custom Prompts with LocalStorage persistence
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_code_reviewer_key') || '');
  const [customPrompt, setCustomPrompt] = useState(() => localStorage.getItem('ai_code_reviewer_prompt') || '');
  
  // Modals state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);

  // Review states
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // CRDT Yjs & IndexedDB Persistence References (Obsidian-Code Architecture)
  const ydocRef = useRef(null);
  const idbRef = useRef(null);
  const [isIdbSynced, setIsIdbSynced] = useState(false);
  const [crdtTransactions, setCrdtTransactions] = useState(1);

  // Initialize Y.Doc & IndexeddbPersistence on mount (Local-First Offline Sync)
  useEffect(() => {
    let isMounted = true;
    try {
      const doc = new Y.Doc();
      ydocRef.current = doc;
      const ytext = doc.getText('content');

      // Hydrate with initial code
      doc.transact(() => {
        if (ytext.length === 0) {
          ytext.insert(0, SAMPLE_SNIPPETS[0].code);
        }
      }, 'seed-code');

      // Local-first browser IndexedDB cache
      const persistence = new IndexeddbPersistence('ai-code-reviewer-atelier', doc);
      idbRef.current = persistence;

      persistence.on('synced', () => {
        if (isMounted) {
          setIsIdbSynced(true);
          setRunnerLogs(prev => [
            ...prev,
            `[CRDT_IDB] local room 'ai-code-reviewer-atelier' hydrated from IndexedDB (zero network latency)`
          ]);
        }
      });

      doc.on('update', () => {
        if (isMounted) setCrdtTransactions(prev => prev + 1);
      });
    } catch (err) {
      console.warn('CRDT initialization warning:', err);
    }

    // Ping FastAPI Backend
    const pingBackend = async () => {
      const isUp = await checkBackendHealth();
      if (isMounted) setBackendOnline(isUp);
    };
    pingBackend();
    const interval = setInterval(pingBackend, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (idbRef.current) idbRef.current.destroy();
    };
  }, []);

  // Save API key / prompt handlers
  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('ai_code_reviewer_key', key);
  };

  const handleSaveCustomPrompt = (prompt) => {
    setCustomPrompt(prompt);
    localStorage.setItem('ai_code_reviewer_prompt', prompt);
  };

  // Load sample snippet from Sidebar or Dropdown
  const handleSelectSample = (sampleId) => {
    const found = SAMPLE_SNIPPETS.find(s => s.id === sampleId);
    if (found) {
      setActiveSnippetId(found.id);
      setCode(found.code);
      setLanguage(found.language);
      setReviewResult(null);
      setErrorMsg('');

      // Update CRDT text
      if (ydocRef.current) {
        const ytext = ydocRef.current.getText('content');
        ydocRef.current.transact(() => {
          ytext.delete(0, ytext.length);
          ytext.insert(0, found.code);
        }, 'switch-file');
      }

      setRunnerLogs(prev => [
        ...prev,
        `[WORKSPACE] loaded file: ${found.id}.${found.language} (${found.title})`
      ]);
    }
  };

  // Execute AI Review via FastAPI / Hybrid Engine
  const handleRunReview = async (overrideCode = null) => {
    const targetCode = overrideCode || code;
    if (!targetCode.trim()) return;
    setIsReviewing(true);
    setErrorMsg('');
    setIsBottomOpen(true);
    setActiveBottomTab('runner');

    const startTime = performance.now();
    setRunnerLogs(prev => [
      ...prev,
      `$ reviewer audit --lang ${language} --model ${selectedModel} --engine hybrid`,
      `[STATIC_AST] parsing abstract syntax tree (cyclomatic complexity & loop nesting)...`
    ]);
    
    try {
      const result = await requestReview({
        code: targetCode,
        language,
        mode: reviewMode,
        apiKey,
        customInstructions: customPrompt
      });
      setReviewResult(result);

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
      setRunnerLogs(prev => [
        ...prev,
        `[LLM_ENGINE] response received (score: ${result.score}/100 | ${result.issues?.length || 0} issues found)`,
        `[AUDIT_COMPLETE] duration: ${elapsed}s (exit 0, nominal)`
      ]);
    } catch (err) {
      console.error('Review failed:', err);
      setErrorMsg(err.message || 'Failed to review code. Please try again.');
      setRunnerLogs(prev => [
        ...prev,
        `[AUDIT_ERROR] ${err.message || 'Review failed.'} (exit 1)`
      ]);
    } finally {
      setIsReviewing(false);
    }
  };

  // Auto-run initial review on mount
  useEffect(() => {
    handleRunReview();
  }, []);

  // Apply refactored code to the editor
  const handleApplyRefactor = (newCode) => {
    setCode(newCode);
    if (ydocRef.current) {
      const ytext = ydocRef.current.getText('content');
      ydocRef.current.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, newCode);
      }, 'apply-refactor');
    }
    setRunnerLogs(prev => [
      ...prev,
      `[REFACTOR_APPLIED] updated buffer with AI-proposed remediation`
    ]);
    setTimeout(() => {
      handleRunReview(newCode);
    }, 200);
  };

  // Handle GitHub PR Import
  const handleLoadPrCode = (prCode, detectedLang) => {
    setCode(prCode);
    setLanguage(detectedLang);
    handleRunReview(prCode);
  };

  // Switch view from Multiplexer header (1:editor, 2:diff, 3:tests, 4:complexity)
  const handleChangeView = (viewId) => {
    setActiveView(viewId);
    if (viewId === 'diff') {
      setActiveTab(REVIEW_MODES.REFACTOR);
    } else if (viewId === 'tests') {
      setActiveTab(REVIEW_MODES.TESTS);
    } else if (viewId === 'complexity' || viewId === 'editor') {
      setActiveTab(REVIEW_MODES.COMPREHENSIVE);
    }
  };

  return (
    <div className="app-container font-mono">
      {/* 1. Multiplexer Status Bar Header */}
      <Header
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenPrModal={() => setIsPrModalOpen(true)}
        onSelectSample={handleSelectSample}
        samples={SAMPLE_SNIPPETS}
        isReviewing={isReviewing}
        backendOnline={backendOnline}
        activeView={activeView}
        onChangeView={handleChangeView}
        crdtTransactions={crdtTransactions}
      />

      {/* 2. Main Workbench Area: Activity Sidebar + Editor + Review Panel */}
      <div className="workbench-grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-[var(--color-paper)]">
        {/* Left: Obsidian-Code Activity Bar & File Explorer Sidebar */}
        {isSidebarOpen && (
          <div className="md:col-span-2 border-r border-[var(--color-rule)] bg-[var(--color-paper-2)] flex flex-col justify-between p-2.5 overflow-hidden text-xs">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-rule)] text-[10.5px] text-[var(--color-muted)] uppercase tracking-wider">
                <span className="flex items-center gap-1 font-semibold text-[var(--color-ink)]">
                  <Folder className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span>explorer</span>
                </span>
                <span>{SAMPLE_SNIPPETS.length} files</span>
              </div>

              {/* Snippet / File List */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                {SAMPLE_SNIPPETS.map((snippet) => {
                  const isSelected = activeSnippetId === snippet.id;
                  return (
                    <button
                      key={snippet.id}
                      type="button"
                      onClick={() => handleSelectSample(snippet.id)}
                      className={`text-left p-2 border text-xs transition-colors flex flex-col gap-0.5 ${
                        isSelected
                          ? "bg-[var(--color-paper-3)] border-[var(--color-accent)] text-[var(--color-ink)] shadow-[inset_2px_0_0_var(--color-accent)] font-semibold"
                          : "bg-[var(--color-paper)] border-[var(--color-rule)] text-[var(--color-muted)] hover:border-[var(--color-rule-2)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[11px] text-[var(--color-ink)]">
                          {snippet.title}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 border border-[var(--color-rule-2)] text-[var(--color-accent)] flex-shrink-0">
                          {snippet.language}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-muted)] line-clamp-1">
                        {snippet.difficulty || 'audit scenario'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Bottom: CRDT Presence & Room Info */}
            <div className="pt-2 border-t border-[var(--color-rule)] text-[10.5px] text-[var(--color-muted)] space-y-1">
              <div className="flex items-center justify-between">
                <span>crdt room:</span>
                <span className="text-[var(--color-accent)]">atelier-main</span>
              </div>
              <div className="flex items-center justify-between">
                <span>indexeddb:</span>
                <span className="text-[var(--color-ink-2)]">{isIdbSynced ? "cached" : "syncing"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Center: Monaco Code Editor Workspace */}
        <div className={`${isSidebarOpen ? 'md:col-span-5' : 'md:col-span-6'} flex flex-col h-full overflow-hidden border-r border-[var(--color-rule)]`}>
          <CodeEditor
            code={code}
            onChangeCode={setCode}
            language={language}
            onChangeLanguage={setLanguage}
            onRunReview={() => handleRunReview()}
            isReviewing={isReviewing}
            reviewMode={reviewMode}
          />
        </div>

        {/* Right: Review & Analytics Panel */}
        <div className={`${isSidebarOpen ? 'md:col-span-5' : 'md:col-span-6'} flex flex-col h-full overflow-hidden bg-[var(--color-paper)]`}>
          <ReviewPanel
            reviewResult={reviewResult}
            isReviewing={isReviewing}
            originalCode={code}
            language={language}
            apiKey={apiKey}
            onApplyRefactor={handleApplyRefactor}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onRunReview={() => handleRunReview()}
          />
        </div>
      </div>

      {/* 3. Collapsible Bottom Panel (Obsidian-Code BottomPanel Architecture) */}
      <div className="border-t border-[var(--color-rule)] bg-[var(--color-paper-2)] shrink-0">
        <div className="h-7 px-3 bg-[var(--color-paper-3)] border-b border-[var(--color-rule)] flex items-center justify-between text-xs">
          {/* Bottom Tabs */}
          <div className="flex items-center gap-1 h-full">
            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('runner');
                setIsBottomOpen(true);
              }}
              className={`px-2.5 h-full text-[11px] border-b-2 flex items-center gap-1 ${
                activeBottomTab === 'runner' && isBottomOpen
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold bg-[var(--color-paper-2)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>[01: Terminal Output]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('crdt');
                setIsBottomOpen(true);
              }}
              className={`px-2.5 h-full text-[11px] border-b-2 flex items-center gap-1 ${
                activeBottomTab === 'crdt' && isBottomOpen
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold bg-[var(--color-paper-2)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>[02: CRDT & Offline IDB]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveBottomTab('man');
                setIsBottomOpen(true);
              }}
              className={`px-2.5 h-full text-[11px] border-b-2 flex items-center gap-1 ${
                activeBottomTab === 'man' && isBottomOpen
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] font-bold bg-[var(--color-paper-2)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span>[03: Man Synopsis]</span>
            </button>
          </div>

          {/* Panel Toggle button */}
          <button
            type="button"
            onClick={() => setIsBottomOpen(!isBottomOpen)}
            className="p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            title={isBottomOpen ? "Collapse Panel" : "Expand Panel"}
          >
            {isBottomOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Drawer Content */}
        {isBottomOpen && (
          <div className="p-3 max-h-[140px] overflow-y-auto bg-[var(--color-paper)] text-xs text-[var(--color-ink-2)]">
            {activeBottomTab === 'runner' && (
              <div className="flex flex-col gap-1">
                {runnerLogs.map((log, idx) => (
                  <div 
                    key={idx}
                    className={
                      log.startsWith("$")
                        ? "text-[var(--color-accent)] font-semibold"
                        : log.includes("exit 0") || log.includes("AUDIT_COMPLETE")
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-muted)]"
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}

            {activeBottomTab === 'crdt' && (
              <div className="flex flex-col gap-1 text-[11px]">
                <div className="text-[var(--color-accent)] font-semibold">
                  # Yjs Conflict-Free Replicated Data Type (CRDT) Diagnostics
                </div>
                <div>• Canonical Room: 'ai-code-reviewer-atelier'</div>
                <div>• Local IndexedDB Cache: {isIdbSynced ? "HYDRATED & SYNCED" : "CONNECTING"}</div>
                <div>• Lamport State Vector Transactions: tx_{crdtTransactions}</div>
                <div>• Awareness Mesh: 3 active collaborative peers (You, agent.ai, auditor)</div>
              </div>
            )}

            {activeBottomTab === 'man' && (
              <div className="flex flex-col gap-1 text-[11px]">
                <div className="text-[var(--color-accent)] font-semibold">
                  # man (1) reviewer · subsystem flags
                </div>
                <div>• $ reviewer audit [--lang &lt;str&gt;] [--model gpt-4o] : executes hybrid static AST + LLM code review</div>
                <div>• $ reviewer test [--runner pytest] : runs sandboxed assertions in temporary isolation</div>
                <div>• $ reviewer diff [--apply] : computes line unified diff and commits changes to Monaco buffer</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Bottom Status Bar (Obsidian-Code StatusBar Architecture) */}
      <footer className="h-7 px-3 bg-[var(--color-paper-2)] border-t border-[var(--color-rule)] flex items-center justify-between text-[11px] text-[var(--color-muted)] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hover:text-[var(--color-ink)]"
            title="Toggle File Explorer Sidebar"
          >
            [sidebar: {isSidebarOpen ? 'show' : 'hide'}]
          </button>
          <span>|</span>
          <span className="text-[var(--color-ink-2)]">{language.toUpperCase()}</span>
          <span>|</span>
          <span>UTF-8</span>
          <span>|</span>
          <span>spaces: 4</span>
        </div>

        <div className="flex items-center gap-3">
          <span>idb: {isIdbSynced ? "cached" : "syncing"}</span>
          <span>|</span>
          <span>fastapi: {backendOnline ? "8000 (ok)" : "offline"}</span>
          <span>|</span>
          <span className="text-[var(--color-accent)] font-semibold">exit 0</span>
        </div>
      </footer>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        customPrompt={customPrompt}
        onSaveCustomPrompt={handleSaveCustomPrompt}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reviewResult={reviewResult}
        originalCode={code}
        language={language}
      />

      <GitHubPrModal
        isOpen={isPrModalOpen}
        onClose={() => setIsPrModalOpen(false)}
        onLoadPRCode={handleLoadPrCode}
      />
    </div>
  );
}

export default App;
