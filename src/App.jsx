import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { ReviewPanel } from './components/ReviewPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ExportModal } from './components/ExportModal';
import { GitHubPrModal } from './components/GitHubPrModal';
import { SAMPLE_SNIPPETS } from './data/sampleSnippets';
import { REVIEW_MODES } from './services/aiService';
import { requestReview, checkBackendHealth } from './services/apiClient';

export function App() {
  const [code, setCode] = useState(SAMPLE_SNIPPETS[0].code);
  const [language, setLanguage] = useState(SAMPLE_SNIPPETS[0].language);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [reviewMode, setReviewMode] = useState(REVIEW_MODES.COMPREHENSIVE);
  const [activeTab, setActiveTab] = useState(REVIEW_MODES.COMPREHENSIVE);
  
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

  // Check backend health on mount
  useEffect(() => {
    const pingBackend = async () => {
      const isUp = await checkBackendHealth();
      setBackendOnline(isUp);
    };
    pingBackend();
    const interval = setInterval(pingBackend, 8000);
    return () => clearInterval(interval);
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

  // Load sample snippet
  const handleSelectSample = (sampleId) => {
    const found = SAMPLE_SNIPPETS.find(s => s.id === sampleId);
    if (found) {
      setCode(found.code);
      setLanguage(found.language);
      setReviewResult(null);
      setErrorMsg('');
    }
  };

  // Execute AI Review via FastAPI / Hybrid Engine
  const handleRunReview = async (overrideCode = null) => {
    const targetCode = overrideCode || code;
    if (!targetCode.trim()) return;
    setIsReviewing(true);
    setErrorMsg('');
    
    try {
      const result = await requestReview({
        code: targetCode,
        language,
        mode: reviewMode,
        apiKey,
        customInstructions: customPrompt
      });
      setReviewResult(result);
    } catch (err) {
      console.error('Review failed:', err);
      setErrorMsg(err.message || 'Failed to review code. Please try again.');
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

  return (
    <div className="app-container">
      {/* Top Header */}
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
      />

      {/* Main Workspace Split Pane */}
      <main className="main-content">
        {/* Left: Code Editor Workspace */}
        <CodeEditor
          code={code}
          onChangeCode={setCode}
          language={language}
          onChangeLanguage={setLanguage}
          onRunReview={() => handleRunReview()}
          isReviewing={isReviewing}
          reviewMode={reviewMode}
        />

        {/* Right: Review & Analytics Panel */}
        <ReviewPanel
          reviewResult={reviewResult}
          isReviewing={isReviewing}
          originalCode={code}
          language={language}
          apiKey={apiKey}
          onApplyRefactor={handleApplyRefactor}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
        />
      </main>

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
