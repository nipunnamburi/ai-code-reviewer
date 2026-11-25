import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Sparkles, 
  Info, 
  Play, 
  ChevronRight, 
  History, 
  GitBranch, 
  Layers, 
  FileCode, 
  Check, 
  X, 
  Clock, 
  Terminal,
  Upload,
  FileText
} from 'lucide-react';
import { ydoc, yprovider, yReviewsArray, yStagedAnnotations, saveReviewToHistory } from './services/crdt';

export default function App() {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard' | 'workbench' | 'history'
  const [modelChoice, setModelChoice] = useState('gemini-3.8-flash');
  const [apiKey, setApiKey] = useState('');
  
  // Input State
  const [inputMode, setInputMode] = useState('code'); // 'code' | 'github'
  const [code, setCode] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [modifiedCode, setModifiedCode] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [targetFileName, setTargetFileName] = useState('snippet.py');

  // File upload input ref
  const fileInputRef = useRef(null);

  // Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [streamSteps, setStreamSteps] = useState([]);
  const [reviewReport, setReviewReport] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [commentStatuses, setCommentStatuses] = useState({});

  const diffEditorRef = useRef(null);

  // Sync Yjs history
  useEffect(() => {
    const updateFromYjs = () => {
      setHistoryItems(yReviewsArray.toArray());
      const statuses = {};
      yStagedAnnotations.forEach((val, key) => {
        statuses[key] = val;
      });
      setCommentStatuses(statuses);
    };

    yprovider.on('synced', updateFromYjs);
    yReviewsArray.observe(updateFromYjs);
    yStagedAnnotations.observe(updateFromYjs);

    return () => {
      yReviewsArray.unobserve(updateFromYjs);
      yStagedAnnotations.unobserve(updateFromYjs);
    };
  }, []);

  // Configure custom Monaco theme
  function handleEditorWillMount(monaco) {
    monaco.editor.defineTheme('soothing-slate', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5f6773', fontStyle: 'italic' },
        { token: 'keyword', foreground: '8fbcbb' },
        { token: 'string', foreground: 'a3be8c' },
        { token: 'number', foreground: 'ebcb8b' },
        { token: 'identifier', foreground: 'eceef2' },
      ],
      colors: {
        'editor.background': '#171a1e',
        'editor.foreground': '#eceef2',
        'editor.lineHighlightBackground': '#1e2228',
        'editorLineNumber.foreground': '#5f6773',
        'editorLineNumber.activeForeground': '#8fbcbb',
        'diffEditor.insertedTextBackground': '#a3be8c18',
        'diffEditor.removedTextBackground': '#bf616a18',
        'diffEditor.insertedLineBackground': '#a3be8c0d',
        'diffEditor.removedLineBackground': '#bf616a0d',
        'editorGutter.background': '#171a1e',
        'scrollbarSlider.background': '#262b3366',
        'scrollbarSlider.hoverBackground': '#262b33bb',
      }
    });
  }

  function handleDiffMount(editor) {
    diffEditorRef.current = editor;
  }

  // Handle Review Stream Submission
  async function startReview() {
    setIsReviewing(true);
    setStreamSteps([]);
    setSelectedCommentId(null);

    let codeToReview = code;
    let fileName = targetFileName;

    // Handle GitHub PR if selected
    if (inputMode === 'github') {
      try {
        setStreamSteps([{ step: 'github', detail: `Fetching PR files from ${githubUrl}...` }]);
        const prRes = await fetch('/api/github/pr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pr_url: githubUrl })
        });
        const prData = await prRes.json();
        if (prData.files && prData.files.length > 0) {
          codeToReview = prData.files[0].patch || prData.files[0].content || code;
          fileName = prData.files[0].filename || 'pr_diff.patch';
          setCode(codeToReview);
          setTargetFileName(fileName);
        }
      } catch (err) {
        console.warn('GitHub fetch error, using fallback code:', err);
      }
    }

    setOriginalCode(codeToReview);
    setModifiedCode(codeToReview);

    try {
      const response = await fetch('/api/review/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToReview,
          language: fileName.endsWith('.js') || fileName.endsWith('.jsx') ? 'javascript' : 'python',
          target_name: fileName,
          api_key: apiKey || null,
          model: modelChoice
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const lines = rawEvent.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const l of lines) {
            if (l.startsWith('event: ')) {
              eventType = l.slice(7).trim();
            } else if (l.startsWith('data: ')) {
              dataStr = l.slice(6).trim();
            }
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (eventType === 'progress') {
                setStreamSteps(prev => [...prev, parsed]);
              } else if (eventType === 'complete') {
                setReviewReport(parsed);
                // Apply refactored code proposal or comments
                if (parsed.refactored_code) {
                  setModifiedCode(parsed.refactored_code);
                }
                saveReviewToHistory(parsed);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream failure:', err);
      setStreamSteps(prev => [...prev, { step: 'error', detail: `Review connection failed: ${err.message}` }]);
    } finally {
      setIsReviewing(false);
    }
  }

  // Accept a single comment fix
  function acceptCommentFix(comment) {
    if (!comment.fixed_code) return;
    
    const lines = modifiedCode.split('\n');
    const startIdx = Math.max(0, comment.start_line - 1);
    const endIdx = Math.min(lines.length, comment.end_line);

    const newLines = [
      ...lines.slice(0, startIdx),
      comment.fixed_code,
      ...lines.slice(endIdx)
    ];

    const updated = newLines.join('\n');
    setModifiedCode(updated);

    // Save status in Yjs map
    yStagedAnnotations.set(comment.id, 'accepted');
  }

  function dismissComment(commentId) {
    yStagedAnnotations.set(commentId, 'dismissed');
  }

  // Handle local file upload
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setTargetFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCode(content);
        setOriginalCode(content);
        setModifiedCode(content);
      }
    };
    reader.readAsText(file);
    // Reset file input so re-uploading the same file works
    e.target.value = '';
  }

  const severityIcons = {
    critical: <AlertOctagon className="w-3.5 h-3.5 text-[#bf616a]" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 text-[#ebcb8b]" />,
    optimization: <Sparkles className="w-3.5 h-3.5 text-[#a3be8c]" />,
    info: <Info className="w-3.5 h-3.5 text-[#8fbcbb]" />
  };

  const severityBadges = {
    critical: 'bg-[#bf616a18] text-[#bf616a] border-[#bf616a33]',
    warning: 'bg-[#ebcb8b18] text-[#ebcb8b] border-[#ebcb8b33]',
    optimization: 'bg-[#a3be8c18] text-[#a3be8c] border-[#a3be8c33]',
    info: 'bg-[#8fbcbb18] text-[#8fbcbb] border-[#8fbcbb33]'
  };

  return (
    <div className="min-h-screen bg-[#111315] text-[#eceef2] font-sans flex flex-col selection:bg-[#8fbcbb33] selection:text-[#eceef2]">
      {/* 48px Slim Top Bar */}
      <header className="h-12 border-b border-[#262b33] bg-[#111315]/90 backdrop-blur-md sticky top-0 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="font-serif italic text-lg tracking-tight text-[#eceef2]">
            Antigravity Reviewer
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded border border-[#262b33] text-[#98a0ad]">
            Dual-Mode
          </span>
        </div>

        {/* View Switcher Tabs with layoutId pill */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#171a1e] border border-[#262b33] text-xs">
          {[
            { id: 'scorecard', label: 'Scorecard', icon: Layers },
            { id: 'workbench', label: 'Diff Workbench', icon: FileCode },
            { id: 'history', label: 'History Board', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-1 rounded-md font-medium flex items-center space-x-1.5 transition-colors z-10 ${
                  isActive ? 'text-[#eceef2]' : 'text-[#98a0ad] hover:text-[#eceef2]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-view-pill"
                    className="absolute inset-0 bg-[#1e2228] border border-[#262b33] rounded-md -z-10 shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Clean top-right badge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-mono text-[11px] text-[#5f6773]">
            Engine: Hybrid 3-Pass
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col space-y-6">
        {/* Editorial Hero Header */}
        <div className="pt-2 pb-4 border-b border-[#262b33] flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl tracking-tight text-[#eceef2] mb-1">
              Your code, honestly reviewed.
            </h1>
            <p className="text-sm text-[#98a0ad]">
              A 3-pass hybrid engine combining AST analysis, deep 4-pillar scorecard evaluation, and bounded line reflection.
            </p>
          </div>

          {/* Unified Input Switcher & Trigger Button */}
          <div className="flex items-center space-x-3">
            <div className="flex rounded-md bg-[#171a1e] border border-[#262b33] p-0.5 text-xs">
              <button
                onClick={() => setInputMode('code')}
                className={`px-3 py-1 rounded transition-colors ${
                  inputMode === 'code' ? 'bg-[#1e2228] text-[#eceef2]' : 'text-[#98a0ad]'
                }`}
              >
                Code / Diff
              </button>
              <button
                onClick={() => setInputMode('github')}
                className={`px-3 py-1 rounded transition-colors ${
                  inputMode === 'github' ? 'bg-[#1e2228] text-[#eceef2]' : 'text-[#98a0ad]'
                }`}
              >
                GitHub PR URL
              </button>
            </div>

            <button
              onClick={startReview}
              disabled={isReviewing}
              className="px-4 py-1.5 rounded-md bg-[#8fbcbb] text-[#111315] font-medium text-xs flex items-center space-x-1.5 hover:bg-[#a3be8c] transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isReviewing ? 'Analyzing...' : 'Run Review'}</span>
            </button>
          </div>
        </div>

        {/* Hidden file input for uploading code files */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".py,.js,.jsx,.ts,.tsx,.json,.sql,.html,.css,.txt,.java,.cpp,.c,.go,.rs,.rb"
        />

        {/* Code Input & File Upload Bar when Code mode is active */}
        {inputMode === 'code' && (
          <div className="bg-[#171a1e] border border-[#262b33] rounded-lg overflow-hidden flex flex-col">
            <div className="h-9 px-4 bg-[#111315] border-b border-[#262b33] flex items-center justify-between text-xs text-[#98a0ad]">
              <div className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-[#8fbcbb]" />
                <input
                  type="text"
                  value={targetFileName}
                  onChange={(e) => setTargetFileName(e.target.value)}
                  className="bg-transparent border-none text-xs font-mono text-[#eceef2] focus:outline-none w-36 hover:bg-[#1e2228] px-1 rounded"
                  title="Target file name"
                />
                <span className="text-[11px] text-[#5f6773] font-mono">• {code.split('\n').length} lines</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded bg-[#1e2228] border border-[#262b33] text-xs text-[#eceef2] hover:border-[#8fbcbb] flex items-center space-x-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#8fbcbb]" />
                  <span>Upload File</span>
                </button>
                {code && (
                  <button
                    type="button"
                    onClick={() => {
                      setCode('');
                      setOriginalCode('');
                      setModifiedCode('');
                    }}
                    className="px-2 py-1 text-xs text-[#5f6773] hover:text-[#eceef2] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="h-56 w-full relative">
              <Editor
                height="100%"
                language={
                  targetFileName.endsWith('.js') || targetFileName.endsWith('.jsx')
                    ? 'javascript'
                    : targetFileName.endsWith('.ts') || targetFileName.endsWith('.tsx')
                    ? 'typescript'
                    : 'python'
                }
                value={code}
                onChange={(val) => setCode(val || '')}
                theme="soothing-slate"
                beforeMount={handleEditorWillMount}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  fontFamily: "'Geist Mono Variable', monospace",
                  lineNumbers: 'on',
                  folding: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  placeholder: 'Type, paste, or upload code to start a review...'
                }}
              />
              {!code && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-4 text-[#5f6773] space-y-1"
                >
                  <div className="pointer-events-auto cursor-pointer flex flex-col items-center hover:text-[#98a0ad] transition-colors">
                    <Upload className="w-5 h-5 mb-1.5 text-[#8fbcbb]" />
                    <span className="text-xs font-mono text-[#98a0ad]">Type, paste code, or click to upload a file</span>
                    <span className="text-[11px] text-[#5f6773]">Supports Python, TypeScript, JavaScript, SQL, and more</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Bar when GitHub mode is active */}
        {inputMode === 'github' && (
          <div className="bg-[#171a1e] border border-[#262b33] rounded-lg p-3 flex items-center space-x-3 text-xs">
            <GitBranch className="w-4 h-4 text-[#8fbcbb]" />
            <input
              type="text"
              placeholder="https://github.com/owner/repo/pull/12"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="flex-1 bg-transparent border-none text-[#eceef2] focus:outline-none placeholder-[#5f6773]"
            />
          </div>
        )}

        {/* Live File-Inspection Ticker (AnimatePresence) */}
        <AnimatePresence>
          {streamSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#171a1e] border border-[#262b33] rounded-lg p-3 font-mono text-xs flex flex-col space-y-1.5 shadow-sm"
            >
              <div className="flex items-center space-x-2 text-[#98a0ad] text-[11px] uppercase tracking-wider pb-1 border-b border-[#262b33]">
                <div className="w-2 h-2 rounded-full bg-[#8fbcbb] animate-pulse" />
                <span>Live Pipeline Execution Log</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-2">
                {streamSteps.map((s, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start space-x-2 text-[#98a0ad]"
                  >
                    <span className="text-[#5f6773] select-none">›</span>
                    <span className="text-[#eceef2] font-semibold">[{s.step}]</span>
                    <span>{s.detail || s.file}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: 4-Pillar Project Scorecard */}
        {activeTab === 'scorecard' && (
          <div className="flex flex-col space-y-6">
            {/* Top Score Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#171a1e] border border-[#262b33] rounded-lg p-4 flex flex-col justify-between">
                <span className="text-xs uppercase font-mono tracking-wider text-[#98a0ad]">
                  Composite Score
                </span>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="font-serif text-5xl text-[#8fbcbb]">
                    {reviewReport ? reviewReport.overall_score : '8.6'}
                  </span>
                  <span className="text-xs text-[#5f6773]">/ 10.0</span>
                </div>
                <span className="text-xs text-[#98a0ad] mt-2">
                  Weighted 4-pillar index
                </span>
              </div>

              {/* 4-Pillars Cards with Stagger */}
              {(reviewReport?.pillars || [
                { name: 'Code Quality', score: 8.5, verdict: 'Clean separation of concerns with isolated pure functions.' },
                { name: 'Originality', score: 8.0, verdict: 'Pragmatic algorithmic design using hash map lookups.' },
                { name: 'Completeness', score: 9.0, verdict: 'Covers edge cases and empty file conditions robustly.' },
                { name: 'Docs', score: 8.8, verdict: 'Clear docstrings, parameter explanations, and type annotations.' }
              ]).map((pillar, idx) => (
                <motion.div
                  key={pillar.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                  className="bg-[#171a1e] border border-[#262b33] rounded-lg p-4 flex flex-col justify-between hover:bg-[#1e2228] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#eceef2]">{pillar.name}</span>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-[#262b33] bg-[#111315] text-[#8fbcbb]">
                      {pillar.score}
                    </span>
                  </div>
                  <p className="text-xs text-[#98a0ad] mt-3 leading-relaxed">
                    {pillar.verdict}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Findings List preview */}
            <div className="bg-[#171a1e] border border-[#262b33] rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#262b33] mb-4">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-[#8fbcbb]" />
                  <h3 className="text-sm font-semibold text-[#eceef2]">
                    Line-Bounded Findings & Actionable Fixes
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('workbench')}
                  className="text-xs text-[#8fbcbb] hover:underline flex items-center space-x-1"
                >
                  <span>Open in Diff Workbench</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {(reviewReport?.comments || [
                  {
                    id: 'sample-1',
                    start_line: 10,
                    end_line: 11,
                    severity: 'critical',
                    title: 'Arbitrary Code Execution via eval()',
                    suggestion: 'Avoid dynamic evaluation of untrusted strings. Use safe AST parsing or explicit lookup tables.',
                    fixed_code: 'return VALID_DISCOUNTS.get(discount_code, 0.0)',
                    confidence: 0.98
                  },
                  {
                    id: 'sample-2',
                    start_line: 23,
                    end_line: 28,
                    severity: 'optimization',
                    title: 'O(N * M) Quadratic Search Bottleneck',
                    suggestion: 'Pre-index the product catalog into a dictionary for O(1) constant time member lookup.',
                    fixed_code: 'catalog_map = {p["id"]: p for p in catalog.get("products", [])}',
                    confidence: 0.91
                  }
                ]).map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-lg border border-[#262b33] bg-[#111315] flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{severityIcons[comment.severity]}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-[#eceef2]">{comment.title}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${severityBadges[comment.severity]}`}>
                            {comment.severity}
                          </span>
                          <span className="text-[11px] font-mono text-[#5f6773]">
                            L{comment.start_line}–{comment.end_line}
                          </span>
                        </div>
                        <p className="text-xs text-[#98a0ad] mt-1">{comment.suggestion}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end md:self-center">
                      <button
                        onClick={() => {
                          acceptCommentFix(comment);
                          setActiveTab('workbench');
                        }}
                        className="px-2.5 py-1 rounded bg-[#1e2228] border border-[#262b33] text-xs text-[#eceef2] hover:border-[#8fbcbb] flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3 text-[#a3be8c]" />
                        <span>Accept Fix</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Monaco Diff Workbench */}
        {activeTab === 'workbench' && (
          <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-[560px]">
            {/* Monaco Diff Editor (65% width) */}
            <div className="flex-1 md:w-[65%] border border-[#262b33] rounded-lg overflow-hidden bg-[#171a1e] flex flex-col">
              <div className="h-9 px-4 bg-[#111315] border-b border-[#262b33] flex items-center justify-between text-xs text-[#98a0ad]">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[#5f6773]">Original vs. Refactored Patch</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2228] text-[#8fbcbb]">
                    {targetFileName}
                  </span>
                </div>
                <span className="text-[11px] font-mono">Soothing Slate Monaco Diff</span>
              </div>
              <div className="flex-1 min-h-[500px]">
                <DiffEditor
                  height="100%"
                  language="python"
                  original={originalCode}
                  modified={modifiedCode}
                  theme="soothing-slate"
                  beforeMount={handleEditorWillMount}
                  onMount={handleDiffMount}
                  options={{
                    renderSideBySide: true,
                    readOnly: false,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    fontFamily: "'Geist Mono Variable', monospace",
                    smoothScrolling: true,
                  }}
                />
              </div>
            </div>

            {/* Staged Annotations Drawer (35% width) */}
            <div className="md:w-[35%] border border-[#262b33] rounded-lg bg-[#171a1e] flex flex-col overflow-hidden">
              <div className="h-9 px-4 bg-[#111315] border-b border-[#262b33] flex items-center justify-between text-xs font-semibold text-[#eceef2]">
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-[#8fbcbb]" />
                  <span>Staged Annotations ({reviewReport?.comments?.length || 0})</span>
                </div>
                <span className="text-[10px] font-mono text-[#98a0ad]">Synced via Yjs</span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {(reviewReport?.comments || []).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5f6773] text-xs">
                    <Terminal className="w-8 h-8 mb-2 stroke-1" />
                    <span>No active annotations yet.</span>
                    <span className="text-[11px] mt-1 text-[#98a0ad]">
                      Run a review or paste code to generate line-level suggestions.
                    </span>
                  </div>
                ) : (
                  (reviewReport?.comments || []).map((comment) => {
                    const status = commentStatuses[comment.id] || 'pending';
                    const isAccepted = status === 'accepted';
                    const isDismissed = status === 'dismissed';

                    return (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-md border transition-all text-xs ${
                          isAccepted
                            ? 'bg-[#111315] border-[#a3be8c44] opacity-80'
                            : isDismissed
                            ? 'bg-[#111315] border-[#262b33] opacity-40'
                            : 'bg-[#111315] border-[#262b33] hover:border-[#8fbcbb55]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-1.5">
                            {severityIcons[comment.severity]}
                            <span className="font-semibold text-[#eceef2]">{comment.title}</span>
                          </div>
                          <span className="font-mono text-[10px] text-[#5f6773]">
                            L{comment.start_line}–{comment.end_line}
                          </span>
                        </div>

                        <p className="text-xs text-[#98a0ad] mt-1.5 leading-relaxed">
                          {comment.suggestion}
                        </p>

                        {comment.fixed_code && (
                          <div className="mt-2 p-2 rounded bg-[#171a1e] border border-[#262b33] font-mono text-[11px] text-[#a3be8c] overflow-x-auto">
                            <code>{comment.fixed_code}</code>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-end space-x-2 pt-2 border-t border-[#262b33]">
                          {!isAccepted && !isDismissed && (
                            <>
                              <button
                                onClick={() => dismissComment(comment.id)}
                                className="px-2 py-0.5 rounded text-[11px] text-[#98a0ad] hover:text-[#eceef2] flex items-center space-x-1"
                              >
                                <X className="w-3 h-3" />
                                <span>Dismiss</span>
                              </button>
                              <button
                                onClick={() => acceptCommentFix(comment)}
                                className="px-2.5 py-1 rounded bg-[#8fbcbb] text-[#111315] font-medium text-[11px] flex items-center space-x-1 hover:bg-[#a3be8c] transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>Apply Patch</span>
                              </button>
                            </>
                          )}
                          {isAccepted && (
                            <span className="text-[11px] text-[#a3be8c] font-medium flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Patch Applied</span>
                            </span>
                          )}
                          {isDismissed && (
                            <span className="text-[11px] text-[#5f6773]">Dismissed</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Local Review History Board (y-indexeddb) */}
        {activeTab === 'history' && (
          <div className="bg-[#171a1e] border border-[#262b33] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#262b33] mb-4">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#8fbcbb]" />
                <h3 className="text-sm font-semibold text-[#eceef2]">
                  Review History Board (Persisted Locally via CRDT)
                </h3>
              </div>
              <span className="text-xs text-[#5f6773] font-mono">
                {historyItems.length} review(s) stored
              </span>
            </div>

            {historyItems.length === 0 ? (
              <div className="text-center py-12 text-[#5f6773] text-xs">
                No past reviews recorded yet. Run your first review above!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historyItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-lg border border-[#262b33] bg-[#111315] hover:bg-[#1e2228] transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#98a0ad]">
                        <span className="font-mono text-[#8fbcbb] truncate max-w-[180px]">
                          {item.repo_or_file_name || 'snippet.py'}
                        </span>
                        <span className="font-serif text-lg text-[#eceef2]">
                          {item.overall_score} / 10.0
                        </span>
                      </div>
                      <p className="text-xs text-[#98a0ad] mt-2 line-clamp-2">
                        {item.summary}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-[#262b33] flex items-center justify-between text-[11px] text-[#5f6773]">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.saved_at ? new Date(item.saved_at).toLocaleTimeString() : 'Recent'}</span>
                      </div>
                      <button
                        onClick={() => {
                          setReviewReport(item);
                          if (item.refactored_code) setModifiedCode(item.refactored_code);
                          setActiveTab('workbench');
                        }}
                        className="text-[#8fbcbb] hover:underline"
                      >
                        Reopen Diff →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
