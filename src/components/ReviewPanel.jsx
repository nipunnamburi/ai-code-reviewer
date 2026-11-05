import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Copy, 
  Play, 
  MessageSquare, 
  Send,
  AlertTriangle,
  AlertOctagon,
  Info,
  Sparkles,
  Loader2
} from 'lucide-react';
import { ScoreGauge } from './ScoreGauge';
import { DiffViewer } from './DiffViewer';
import { ComplexityCard } from './ComplexityCard';
import { REVIEW_MODES } from '../services/aiService';
import { executeTests, askFollowupChat } from '../services/apiClient';

export function ReviewPanel({
  reviewResult,
  isReviewing,
  originalCode,
  language,
  apiKey,
  onApplyRefactor,
  activeTab,
  onChangeTab,
  onRunReview
}) {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [expandedIssues, setExpandedIssues] = useState({});
  const [copiedTest, setCopiedTest] = useState(false);

  // Test Runner state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testRunResult, setTestRunResult] = useState(null);

  // Conversational Follow-up state
  const [activeChatIssueId, setActiveChatIssueId] = useState(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState({});

  const toggleIssue = (id) => {
    setExpandedIssues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const issues = reviewResult?.issues || [];
  const filteredIssues = issues.filter(issue => {
    if (selectedSeverity === 'all') return true;
    return issue.severity === selectedSeverity;
  });

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  const handleCopyTests = () => {
    if (reviewResult?.unitTests) {
      navigator.clipboard.writeText(reviewResult.unitTests);
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 1400);
    }
  };

  // Run Real Tests via FastAPI
  const handleExecuteTests = async () => {
    if (!reviewResult?.unitTests) return;
    setIsRunningTests(true);
    setTestRunResult(null);

    try {
      const res = await executeTests({
        code: originalCode,
        testCode: reviewResult.unitTests,
        language
      });
      setTestRunResult(res);
    } catch (err) {
      setTestRunResult({
        success: false,
        passed: 0,
        failed: 1,
        total: 1,
        runtime: 0.05,
        output: err.message,
        traceback: 'Test execution failed.'
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Conversational Follow-up Submit
  const handleSendFollowup = async (issue, presetQuestion = null) => {
    const q = presetQuestion || chatQuestion;
    if (!q.trim()) return;

    setChatLoading(true);
    const issueId = issue.id;

    setChatHistory(prev => ({
      ...prev,
      [issueId]: [...(prev[issueId] || []), { role: 'user', text: q }]
    }));
    setChatQuestion('');

    try {
      const answer = await askFollowupChat({
        question: q,
        contextCode: originalCode,
        issueContext: issue,
        apiKey
      });

      setChatHistory(prev => ({
        ...prev,
        [issueId]: [...(prev[issueId] || []), { role: 'assistant', text: answer }]
      }));
    } catch (e) {
      setChatHistory(prev => ({
        ...prev,
        [issueId]: [...(prev[issueId] || []), { role: 'assistant', text: `Error: ${e.message}` }]
      }));
    } finally {
      setChatLoading(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="badge-terminal border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-wash)] uppercase font-bold text-[10px]">
            [CRITICAL]
          </span>
        );
      case 'warning':
        return (
          <span className="badge-terminal border-[var(--color-rule-2)] text-[var(--color-ink)] uppercase font-semibold text-[10px]">
            [WARNING]
          </span>
        );
      default:
        return (
          <span className="badge-terminal border-[var(--color-rule)] text-[var(--color-muted)] uppercase text-[10px]">
            [{sev || 'INFO'}]
          </span>
        );
    }
  };

  const TABS = [
    { id: REVIEW_MODES.COMPREHENSIVE, label: 'audit findings' },
    { id: REVIEW_MODES.REFACTOR, label: 'refactor diff' },
    { id: REVIEW_MODES.TESTS, label: 'pytest suites' },
    { id: REVIEW_MODES.EXPLAIN, label: 'explanation' }
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-paper)] overflow-hidden relative font-mono">
      {/* Review Toolbar & Tabs */}
      <div className="h-10 px-3 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-stretch h-full">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`px-3 flex items-center border-r border-[var(--color-rule)] text-[11px] whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[var(--color-paper-3)] text-[var(--color-ink)] font-semibold shadow-[inset_0_-2px_0_var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Severity stats counter */}
        {reviewResult && (
          <div className="flex items-center gap-1.5 text-[10.5px]">
            {criticalCount > 0 && (
              <span className="px-1.5 py-0.5 border border-[var(--color-accent)] text-[var(--color-accent)]">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-1.5 py-0.5 border border-[var(--color-rule-2)] text-[var(--color-ink-2)]">
                {warningCount} warnings
              </span>
            )}
          </div>
        )}
      </div>

      {/* Review Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
        {isReviewing ? (
          /* Loading State */
          <div className="flex flex-col gap-2.5 animate-pulse">
            <div className="h-20 bg-[var(--color-paper-2)] border border-[var(--color-rule)]" />
            <div className="h-16 bg-[var(--color-paper-2)] border border-[var(--color-rule)]" />
            <div className="h-28 bg-[var(--color-paper-2)] border border-[var(--color-rule)]" />
          </div>
        ) : !reviewResult ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-[var(--color-rule)] bg-[var(--color-paper-2)]">
            <div className="text-xs font-semibold text-[var(--color-ink)] mb-1">
              // NO CODE REVIEW BUFFER LOADED
            </div>
            <p className="text-[11px] text-[var(--color-muted)] max-w-xs mb-3">
              $ select a snippet from the left sidebar or paste code to execute hybrid static + LLM analysis.
            </p>
            <button 
              type="button" 
              onClick={onRunReview} 
              className="btn-terminal-primary text-[11px]"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>run review</span>
            </button>
          </div>
        ) : (
          <>
            {/* Inline notice if any */}
            {reviewResult.apiNotice && (
              <div className="p-2 border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[11px] text-[var(--color-accent)]">
                // NOTICE: {reviewResult.apiNotice}
              </div>
            )}

            {/* TAB 1: REVIEW FINDINGS */}
            {activeTab === REVIEW_MODES.COMPREHENSIVE && (
              <div className="flex flex-col gap-3">
                <ScoreGauge 
                  score={reviewResult.score} 
                  metrics={reviewResult.metrics} 
                  summary={reviewResult.summary} 
                />

                {/* DSA Big-O Complexity Card */}
                {reviewResult.complexity && (
                  <ComplexityCard complexity={reviewResult.complexity} />
                )}

                {/* Severity Filter Controls */}
                <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-1.5 text-xs">
                  <span className="font-semibold text-[var(--color-ink)] uppercase tracking-wide text-[11px]">
                    findings ({filteredIssues.length})
                  </span>

                  <div className="flex border border-[var(--color-rule)]">
                    {['all', 'critical', 'warning', 'optimization'].map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSelectedSeverity(filter)}
                        className={`text-[10.5px] px-2 py-0.5 capitalize transition-colors ${
                          selectedSeverity === filter
                            ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-bold'
                            : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issues list */}
                <div className="flex flex-col gap-2">
                  {filteredIssues.map((issue) => {
                    const isExpanded = expandedIssues[issue.id] ?? true;
                    const isChatOpen = activeChatIssueId === issue.id;
                    const history = chatHistory[issue.id] || [];

                    return (
                      <div 
                        key={issue.id} 
                        className="terminal-well border border-[var(--color-rule)]"
                      >
                        <div 
                          className="p-3 flex items-start justify-between cursor-pointer gap-2 hover:bg-[var(--color-paper-3)] transition-colors"
                          onClick={() => toggleIssue(issue.id)}
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {getSeverityBadge(issue.severity)}
                            
                            {issue.line && (
                              <span className="text-[10px] px-1 py-0.2 border border-[var(--color-rule-2)] text-[var(--color-muted)]">
                                L{issue.line}
                              </span>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs text-[var(--color-ink)] truncate">
                                {issue.title}
                              </div>
                              <div className="text-[10.5px] text-[var(--color-muted)] mt-0.5">
                                category: {issue.category}
                              </div>
                            </div>
                          </div>

                          <div className="text-[var(--color-muted)] shrink-0">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 text-xs border-t border-[var(--color-rule)] mt-1">
                            <p className="text-[var(--color-ink-2)] my-2 text-[11.5px] leading-relaxed">
                              {issue.description}
                            </p>

                            {/* Problematic Code Snippet */}
                            {issue.originalSnippet && (
                              <div className="space-y-1 mb-2">
                                <div className="text-[10px] uppercase font-semibold text-[var(--color-muted)]">
                                  # problematic code:
                                </div>
                                <div className="p-2 border border-[var(--color-rule)] bg-[var(--color-paper)] text-[11px] text-[var(--color-muted)] overflow-x-auto">
                                  <code>- {issue.originalSnippet}</code>
                                </div>
                              </div>
                            )}

                            {/* Suggested Fix Snippet */}
                            {issue.suggestedSnippet && (
                              <div className="space-y-1 mb-2">
                                <div className="text-[10px] uppercase font-semibold text-[var(--color-accent)]">
                                  # suggested remediation:
                                </div>
                                <div className="p-2 border border-[var(--color-accent)] bg-[var(--color-accent-wash)] text-[11px] text-[var(--color-ink)] overflow-x-auto">
                                  <code>+ {issue.suggestedSnippet}</code>
                                </div>
                              </div>
                            )}

                            {issue.explanation && (
                              <div className="text-[11px] text-[var(--color-muted)] bg-[var(--color-paper)] border border-[var(--color-rule)] p-2 mb-2">
                                <span className="text-[var(--color-ink)] font-semibold mr-1">// why:</span>
                                <span>{issue.explanation}</span>
                              </div>
                            )}

                            {/* Conversational Follow-up */}
                            <div className="border-t border-[var(--color-rule)] pt-2 mt-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    type="button"
                                    onClick={() => handleSendFollowup(issue, 'Why is this dangerous in production?')}
                                    className="btn-terminal-secondary text-[10px] py-0.5 px-2"
                                  >
                                    why dangerous?
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleSendFollowup(issue, 'How do I write a test for this?')}
                                    className="btn-terminal-secondary text-[10px] py-0.5 px-2"
                                  >
                                    how to test?
                                  </button>
                                </div>

                                <button 
                                  type="button"
                                  onClick={() => setActiveChatIssueId(isChatOpen ? null : issue.id)}
                                  title="Ask follow-up"
                                  className="p-1 border border-transparent hover:border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Chat History */}
                              {history.length > 0 && (
                                <div className="space-y-1.5 p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] text-[11px]">
                                  {history.map((msg, mIdx) => (
                                    <div key={mIdx}>
                                      <span className={`font-semibold mr-1.5 ${msg.role === 'user' ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]'}`}>
                                        {msg.role === 'user' ? 'user@enterprise:~$' : 'agent@langgraph:#'}
                                      </span>
                                      <span className="text-[var(--color-ink-2)]">{msg.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Chat input box */}
                              {isChatOpen && (
                                <div className="flex items-center gap-2 pt-1">
                                  <input 
                                    type="text" 
                                    placeholder="ask follow-up question..."
                                    value={chatQuestion}
                                    onChange={(e) => setChatQuestion(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSendFollowup(issue);
                                    }}
                                    className="flex-1 h-7 text-xs bg-[var(--color-paper)] border border-[var(--color-rule-2)] px-2 text-[var(--color-ink)] focus:outline-none"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => handleSendFollowup(issue)}
                                    disabled={chatLoading}
                                    className="btn-terminal-primary text-[11px] h-7 px-2.5"
                                  >
                                    {chatLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: REFACTOR DIFF */}
            {activeTab === REVIEW_MODES.REFACTOR && (
              <DiffViewer
                originalCode={originalCode}
                refactoredCode={reviewResult.refactoredCode}
                onApplyRefactor={onApplyRefactor}
              />
            )}

            {/* TAB 3: UNIT TESTS */}
            {activeTab === REVIEW_MODES.TESTS && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2">
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wide">
                      automated unit test suite
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      pytest executable assertions validating boundaries & edge cases.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={handleCopyTests}
                      className="btn-terminal-secondary text-[11px] py-1 px-2.5"
                    >
                      {copiedTest ? <Check className="w-3 h-3 text-[var(--color-accent)]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTest ? 'copied' : 'copy tests'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteTests}
                      disabled={isRunningTests || !reviewResult.unitTests}
                      className="btn-terminal-primary text-[11px] py-1 px-3"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isRunningTests ? 'running...' : 'execute in sandbox'}</span>
                    </button>
                  </div>
                </div>

                {/* Test Code Box */}
                <div className="p-3 border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-xs overflow-x-auto max-h-[380px]">
                  <pre className="text-[var(--color-ink-2)] leading-relaxed">
                    <code>{reviewResult.unitTests || '# No tests generated.'}</code>
                  </pre>
                </div>

                {/* Real-time Test Output from Subprocess */}
                {testRunResult && (
                  <div className="border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={testRunResult.success ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}>
                        {testRunResult.success ? '[SUCCESS] ALL ASSERTIONS PASSED' : '[FAILED] TEST ASSERTIONS FAILED'}
                      </span>
                      <span className="text-[var(--color-muted)] text-[11px]">
                        {testRunResult.passed}/{testRunResult.total} passed in {testRunResult.runtime}s
                      </span>
                    </div>

                    <div className="p-2 border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[11px] text-[var(--color-ink-2)] overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{testRunResult.output || testRunResult.traceback}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: EXPLAIN */}
            {activeTab === REVIEW_MODES.EXPLAIN && (
              <div className="flex flex-col gap-3">
                <div className="terminal-well p-4 space-y-2 text-xs">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    # architectural evaluation synopsis
                  </div>
                  <p className="text-[var(--color-ink-2)] leading-relaxed text-[11.5px]">
                    {reviewResult.summary || 'Summary not available.'}
                  </p>
                </div>

                {reviewResult.codeExplanation && (
                  <div className="terminal-well p-4 space-y-2 text-xs">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                      # code decomposition & execution trace
                    </div>
                    <div className="p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule)] text-[11.5px] text-[var(--color-ink-2)] whitespace-pre-wrap leading-relaxed">
                      {reviewResult.codeExplanation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ReviewPanel;
