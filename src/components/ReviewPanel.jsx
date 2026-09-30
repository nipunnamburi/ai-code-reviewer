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
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Sparkles,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { ScoreGauge } from './ScoreGauge';
import { DiffViewer } from './DiffViewer';
import { ComplexityCard } from './ComplexityCard';
import { REVIEW_MODES } from '../services/aiService';
import { executeTests, askFollowupChat } from '../services/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

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

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return (
          <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider bg-rose-500/15 text-rose-400 border-rose-500/30 gap-1">
            <AlertOctagon className="size-2.5" />
            Critical
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
            <AlertTriangle className="size-2.5" />
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary border-primary/25 gap-1">
            <Info className="size-2.5" />
            {sev || 'Info'}
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Review Toolbar & Tabs */}
      <div className="h-11 px-4 border-b border-border/40 bg-card/40 flex items-center justify-between shrink-0">
        <Tabs value={activeTab} onValueChange={onChangeTab} className="h-full">
          <TabsList className="h-8 bg-muted/40 p-0.5 border border-border/40">
            <TabsTrigger value={REVIEW_MODES.COMPREHENSIVE} className="text-xs px-3 h-7 data-active:bg-background data-active:text-foreground">
              Review
            </TabsTrigger>
            <TabsTrigger value={REVIEW_MODES.REFACTOR} className="text-xs px-3 h-7 data-active:bg-background data-active:text-foreground">
              Refactor Diff
            </TabsTrigger>
            <TabsTrigger value={REVIEW_MODES.TESTS} className="text-xs px-3 h-7 data-active:bg-background data-active:text-foreground">
              Unit Tests
            </TabsTrigger>
            <TabsTrigger value={REVIEW_MODES.EXPLAIN} className="text-xs px-3 h-7 data-active:bg-background data-active:text-foreground">
              Explain
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Severity stats counter */}
        {reviewResult && (
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-semibold bg-rose-500/15 text-rose-400 border-rose-500/30">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border-amber-500/30">
                {warningCount} Warnings
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Review Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
        {isReviewing ? (
          /* Loading State */
          <div className="flex flex-col gap-3 animate-pulse">
            <div className="h-24 rounded-xl bg-muted/40 border border-border/30" />
            <div className="h-20 rounded-xl bg-muted/30 border border-border/30" />
            <div className="h-32 rounded-xl bg-muted/20 border border-border/30" />
            <div className="h-32 rounded-xl bg-muted/20 border border-border/30" />
          </div>
        ) : !reviewResult ? (
          /* Empty State */
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-card/40 border-dashed border-border/60">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Sparkles className="size-5" />
            </div>
            <div className="text-sm font-semibold text-foreground mb-1">
              No Code Review Generated
            </div>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Select a sample snippet or paste source code into the editor on the left to run static analysis and AI review.
            </p>
            <Button size="sm" onClick={onRunReview} className="gap-1.5 text-xs shadow-sm">
              <Sparkles className="size-3.5" />
              Run Code Review
            </Button>
          </Card>
        ) : (
          <>
            {/* Inline notice if any */}
            {reviewResult.apiNotice && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>{reviewResult.apiNotice}</span>
              </div>
            )}

            {/* TAB 1: REVIEW */}
            {activeTab === REVIEW_MODES.COMPREHENSIVE && (
              <div className="flex flex-col gap-3.5">
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
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-foreground tracking-tight">
                    Findings ({filteredIssues.length})
                  </span>

                  <div className="flex rounded-md bg-muted/50 p-0.5 border border-border/40">
                    {['all', 'critical', 'warning', 'optimization'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setSelectedSeverity(filter)}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize transition-all ${
                          selectedSeverity === filter
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issues list */}
                <div className="flex flex-col gap-2.5">
                  {filteredIssues.map((issue) => {
                    const isExpanded = expandedIssues[issue.id] ?? true;
                    const isChatOpen = activeChatIssueId === issue.id;
                    const history = chatHistory[issue.id] || [];

                    return (
                      <Card 
                        key={issue.id} 
                        className="bg-card/70 border-border/50 hover:border-border/80 transition-all shadow-xs overflow-hidden"
                      >
                        <div 
                          className="p-3.5 flex items-start justify-between cursor-pointer gap-3 hover:bg-muted/10 transition-colors"
                          onClick={() => toggleIssue(issue.id)}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {getSeverityBadge(issue.severity)}
                            
                            {issue.line && (
                              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-5 bg-muted/40 text-muted-foreground border-border/40">
                                L{issue.line}
                              </Badge>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs text-foreground tracking-tight">
                                {issue.title}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {issue.category}
                              </div>
                            </div>
                          </div>

                          <div className="text-muted-foreground shrink-0 mt-0.5">
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-0 text-xs border-t border-border/30 mt-1">
                            <p className="text-foreground/90 my-2.5 leading-relaxed">
                              {issue.description}
                            </p>

                            {/* Original vs Suggested Snippet */}
                            {issue.originalSnippet && (
                              <div className="space-y-1 mb-2">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                                  Problematic Code:
                                </div>
                                <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-2 font-mono text-[11px] text-rose-300 overflow-x-auto">
                                  <code>{issue.originalSnippet}</code>
                                </div>
                              </div>
                            )}

                            {issue.suggestedSnippet && (
                              <div className="space-y-1 mb-2">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                                  Suggested Fix:
                                </div>
                                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                                  <code>{issue.suggestedSnippet}</code>
                                </div>
                              </div>
                            )}

                            {issue.explanation && (
                              <div className="text-xs text-muted-foreground bg-muted/30 border border-border/30 rounded-md p-2.5 mb-2.5">
                                <span className="font-semibold text-foreground mr-1">Why:</span>
                                <span>{issue.explanation}</span>
                              </div>
                            )}

                            {/* Conversational Follow-up */}
                            <div className="border-t border-border/30 pt-2.5 mt-2.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Button 
                                    variant="outline" 
                                    size="xs"
                                    onClick={() => handleSendFollowup(issue, 'Why is this dangerous in production?')}
                                    className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground border-border/50"
                                  >
                                    Why is this dangerous?
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="xs"
                                    onClick={() => handleSendFollowup(issue, 'How do I write a test for this?')}
                                    className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground border-border/50"
                                  >
                                    How to test this?
                                  </Button>
                                </div>

                                <Button 
                                  variant="ghost" 
                                  size="icon-xs"
                                  onClick={() => setActiveChatIssueId(isChatOpen ? null : issue.id)}
                                  title="Ask follow-up question"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <MessageSquare className="size-3.5" />
                                </Button>
                              </div>

                              {/* Chat History */}
                              {history.length > 0 && (
                                <div className="space-y-2 rounded-lg bg-background/70 border border-border/40 p-2.5">
                                  {history.map((msg, mIdx) => (
                                    <div key={mIdx} className="text-xs leading-relaxed">
                                      <span className={`font-semibold mr-1.5 ${msg.role === 'user' ? 'text-primary' : 'text-emerald-400'}`}>
                                        {msg.role === 'user' ? 'You:' : 'AI:'}
                                      </span>
                                      <span className="text-muted-foreground whitespace-pre-line">{msg.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Chat input box */}
                              {isChatOpen && (
                                <div className="flex items-center gap-2 pt-1">
                                  <Input 
                                    type="text" 
                                    placeholder="Ask follow-up question about this finding..."
                                    value={chatQuestion}
                                    onChange={(e) => setChatQuestion(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSendFollowup(issue);
                                    }}
                                    className="h-7 text-xs bg-background/50 border-input/60"
                                  />
                                  <Button 
                                    size="icon-xs" 
                                    onClick={() => handleSendFollowup(issue)}
                                    disabled={chatLoading}
                                    className="h-7 w-7 shrink-0"
                                  >
                                    {chatLoading ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
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
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground tracking-tight">
                      Automated Unit Tests
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Executable pytest test suite generated for edge-case validation.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyTests} className="h-7 text-xs gap-1.5">
                      <Copy className="size-3" />
                      <span>{copiedTest ? 'Copied' : 'Copy'}</span>
                    </Button>

                    <Button 
                      size="sm"
                      onClick={handleExecuteTests}
                      disabled={isRunningTests}
                      className="h-7 text-xs gap-1.5 shadow-sm"
                    >
                      {isRunningTests ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                      <span>{isRunningTests ? 'Running...' : 'Run Tests'}</span>
                    </Button>
                  </div>
                </div>

                {/* TEST RUN RESULT BANNER */}
                {testRunResult && (
                  <div 
                    className={`rounded-lg border p-3 flex items-center justify-between ${
                      testRunResult.success 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {testRunResult.success ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-rose-400" />
                      )}
                      <div>
                        <div className="text-xs font-semibold">
                          {testRunResult.success ? 'All Tests Passed' : 'Tests Failed'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {testRunResult.passed} Passed • {testRunResult.failed} Failed • Runtime: {testRunResult.runtime}s
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Code Box */}
                <div className="rounded-lg border border-border/50 bg-[#07090e] p-3 font-mono text-xs leading-relaxed max-h-[460px] overflow-y-auto">
                  <pre><code>{reviewResult.unitTests}</code></pre>
                </div>
              </div>
            )}

            {/* TAB 4: EXPLAIN */}
            {activeTab === REVIEW_MODES.EXPLAIN && (
              <div className="flex flex-col gap-2.5">
                <div className="text-sm font-semibold text-foreground tracking-tight">
                  Architecture & Code Explanation
                </div>
                
                <Card className="bg-card/70 border-border/50 backdrop-blur-sm">
                  <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                    {reviewResult.explanation}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
