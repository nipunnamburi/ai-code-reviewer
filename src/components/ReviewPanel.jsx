import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Copy, 
  Play, 
  MessageSquare, 
  Send,
  CheckCircle2,
  XCircle
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
      setTimeout(() => setCopiedTest(false), 2000);
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

  return (
    <div className="review-workspace">
      {/* Review Toolbar & Tabs */}
      <div className="review-toolbar">
        <div className="mode-tabs">
          <button 
            className={`mode-tab ${activeTab === REVIEW_MODES.COMPREHENSIVE ? 'active' : ''}`}
            onClick={() => onChangeTab(REVIEW_MODES.COMPREHENSIVE)}
          >
            Review
          </button>

          <button 
            className={`mode-tab ${activeTab === REVIEW_MODES.REFACTOR ? 'active' : ''}`}
            onClick={() => onChangeTab(REVIEW_MODES.REFACTOR)}
          >
            Refactor Diff
          </button>

          <button 
            className={`mode-tab ${activeTab === REVIEW_MODES.TESTS ? 'active' : ''}`}
            onClick={() => onChangeTab(REVIEW_MODES.TESTS)}
          >
            Unit Tests
          </button>

          <button 
            className={`mode-tab ${activeTab === REVIEW_MODES.EXPLAIN ? 'active' : ''}`}
            onClick={() => onChangeTab(REVIEW_MODES.EXPLAIN)}
          >
            Explain
          </button>
        </div>

        {/* Severity stats */}
        {reviewResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem' }}>
            {criticalCount > 0 && (
              <span className="issue-severity severity-critical">
                {criticalCount} Critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="issue-severity severity-warning">
                {warningCount} Warnings
              </span>
            )}
          </div>
        )}
      </div>

      {/* Review Content Area */}
      <div className="review-scroll-area">
        {isReviewing ? (
          /* Skeleton Loading State */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton-box" style={{ height: '90px' }} />
            <div className="skeleton-box" style={{ height: '70px' }} />
            <div className="skeleton-box" style={{ height: '110px' }} />
            <div className="skeleton-box" style={{ height: '110px' }} />
          </div>
        ) : !reviewResult ? (
          /* Empty State */
          <div className="empty-state-box">
            <div className="empty-state-title">No Code Review Generated</div>
            <div className="empty-state-desc">
              Select a sample snippet or paste source code into the editor on the left to run static analysis and code review.
            </div>
            <button className="btn-primary" onClick={onRunReview}>
              Run Code Review
            </button>
          </div>
        ) : (
          <>
            {/* Inline notice if any */}
            {reviewResult.apiNotice && (
              <div 
                style={{ 
                  background: 'var(--semantic-warning-subtle)', 
                  border: '1px solid rgba(245, 158, 11, 0.25)', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem', 
                  color: 'var(--semantic-warning)' 
                }}
              >
                {reviewResult.apiNotice}
              </div>
            )}

            {/* TAB 1: REVIEW */}
            {activeTab === REVIEW_MODES.COMPREHENSIVE && (
              <>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Findings ({filteredIssues.length})
                  </span>

                  <div style={{ display: 'flex', gap: '2px' }}>
                    {['all', 'critical', 'warning', 'optimization'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setSelectedSeverity(filter)}
                        style={{
                          fontSize: '0.725rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          background: selectedSeverity === filter ? 'var(--bg-elevated)' : 'transparent',
                          color: selectedSeverity === filter ? '#ffffff' : 'var(--text-muted)'
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issues list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredIssues.map((issue) => {
                    const isExpanded = expandedIssues[issue.id] ?? true;
                    const isChatOpen = activeChatIssueId === issue.id;
                    const history = chatHistory[issue.id] || [];

                    return (
                      <div key={issue.id} className="issue-card">
                        <div 
                          className="issue-header"
                          onClick={() => toggleIssue(issue.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span className={`issue-severity severity-${issue.severity}`}>
                              {issue.severity}
                            </span>
                            {issue.line && (
                              <span 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  fontFamily: 'var(--font-mono)', 
                                  background: 'var(--bg-surface)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              >
                                L{issue.line}
                              </span>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                                {issue.title}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                {issue.category}
                              </div>
                            </div>
                          </div>

                          <div style={{ color: 'var(--text-muted)' }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="issue-body">
                            <p style={{ marginBottom: '8px' }}>
                              {issue.description}
                            </p>

                            {/* Original vs Suggested Snippet */}
                            {issue.originalSnippet && (
                              <div style={{ marginBottom: '6px' }}>
                                <div style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--semantic-error)', marginBottom: '2px' }}>
                                  Problematic Code:
                                </div>
                                <div className="code-snippet-box code-diff-old">
                                  <code>{issue.originalSnippet}</code>
                                </div>
                              </div>
                            )}

                            {issue.suggestedSnippet && (
                              <div style={{ marginBottom: '6px' }}>
                                <div style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--semantic-success)', marginBottom: '2px' }}>
                                  Suggested Fix:
                                </div>
                                <div className="code-snippet-box code-diff-new">
                                  <code>{issue.suggestedSnippet}</code>
                                </div>
                              </div>
                            )}

                            {issue.explanation && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: '4px', marginBottom: '8px', border: '1px solid var(--border-subtle)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Why: </strong>
                                {issue.explanation}
                              </div>
                            )}

                            {/* Conversational Follow-up */}
                            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    className="btn-secondary" 
                                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                                    onClick={() => handleSendFollowup(issue, 'Why is this dangerous in production?')}
                                  >
                                    Why is this dangerous?
                                  </button>
                                  <button 
                                    className="btn-secondary" 
                                    style={{ fontSize: '0.7rem', padding: '3px 6px' }}
                                    onClick={() => handleSendFollowup(issue, 'How do I write a test for this?')}
                                  >
                                    How to test this?
                                  </button>
                                </div>

                                <button 
                                  className="btn-icon"
                                  onClick={() => setActiveChatIssueId(isChatOpen ? null : issue.id)}
                                  title="Ask question"
                                >
                                  <MessageSquare size={13} />
                                </button>
                              </div>

                              {/* Chat History */}
                              {history.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                                  {history.map((msg, mIdx) => (
                                    <div key={mIdx} style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                                      <strong style={{ color: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--semantic-success)' }}>
                                        {msg.role === 'user' ? 'You: ' : 'Assistant: '}
                                      </strong>
                                      <span style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{msg.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Chat input box */}
                              {isChatOpen && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                  <input 
                                    type="text" 
                                    placeholder="Ask follow-up question..."
                                    value={chatQuestion}
                                    onChange={(e) => setChatQuestion(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSendFollowup(issue);
                                    }}
                                    style={{
                                      flex: 1,
                                      background: 'var(--bg-surface)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: '4px',
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      color: 'var(--text-primary)',
                                      outline: 'none'
                                    }}
                                  />
                                  <button 
                                    className="btn-primary" 
                                    style={{ padding: '4px 8px' }}
                                    onClick={() => handleSendFollowup(issue)}
                                    disabled={chatLoading}
                                  >
                                    <Send size={12} />
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
              </>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Automated Unit Tests
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Executable pytest test suite.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button className="btn-secondary" onClick={handleCopyTests}>
                      <Copy size={12} />
                      <span>{copiedTest ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button 
                      className="btn-primary"
                      onClick={handleExecuteTests}
                      disabled={isRunningTests}
                    >
                      <Play size={12} />
                      <span>{isRunningTests ? 'Running...' : 'Run Tests'}</span>
                    </button>
                  </div>
                </div>

                {/* TEST RUN RESULT BANNER */}
                {testRunResult && (
                  <div 
                    style={{
                      background: testRunResult.success ? 'var(--semantic-success-subtle)' : 'var(--semantic-error-subtle)',
                      border: `1px solid ${testRunResult.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      borderRadius: '6px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {testRunResult.success ? (
                        <CheckCircle2 size={16} color="var(--semantic-success)" />
                      ) : (
                        <XCircle size={16} color="var(--semantic-error)" />
                      )}
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: testRunResult.success ? 'var(--semantic-success)' : 'var(--semantic-error)' }}>
                          {testRunResult.success ? 'Tests Passed' : 'Tests Failed'}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {testRunResult.passed} Passed • {testRunResult.failed} Failed • Runtime: {testRunResult.runtime}s
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Code Box */}
                <div 
                  className="code-snippet-box"
                  style={{ maxHeight: '420px', overflowY: 'auto', padding: '12px', lineHeight: 1.5 }}
                >
                  <pre><code>{reviewResult.unitTests}</code></pre>
                </div>
              </div>
            )}

            {/* TAB 4: EXPLAIN */}
            {activeTab === REVIEW_MODES.EXPLAIN && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Architecture & Code Explanation
                </div>
                
                <div 
                  style={{ 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '6px', 
                    padding: '14px',
                    fontSize: '0.8125rem',
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)'
                  }}
                >
                  <div style={{ whiteSpace: 'pre-line' }}>
                    {reviewResult.explanation}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
