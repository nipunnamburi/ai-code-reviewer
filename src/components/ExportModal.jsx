import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, FolderDown, Check } from 'lucide-react';

export function ExportModal({
  isOpen,
  onClose,
  reviewResult,
  originalCode,
  language
}) {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');

  const handleOpenChange = (open) => {
    if (!open) onClose();
  };

  const generateMarkdownReport = () => {
    if (!reviewResult) return '# No review available';

    return `# Code Review Report
**Date:** ${new Date().toLocaleDateString()}
**Language:** ${language}
**Health Score:** ${reviewResult.score}/100

## Summary
${reviewResult.summary}

### Health Metrics
- Security: ${reviewResult.metrics?.security}%
- Maintainability: ${reviewResult.metrics?.maintainability}%
- Performance: ${reviewResult.metrics?.performance}%
- Readability: ${reviewResult.metrics?.readability}%

---

## Detailed Findings (${reviewResult.issues?.length || 0} issues)

${(reviewResult.issues || []).map((issue, idx) => `
### ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}
- Category: ${issue.category}
- Line: ${issue.line || 'General'}
- Description: ${issue.description}

\`\`\`${language}
// Problematic code:
${issue.originalSnippet || ''}

// Suggested fix:
${issue.suggestedSnippet || ''}
\`\`\`
> Why: ${issue.explanation || ''}
`).join('\n')}

---

## Refactored Implementation

\`\`\`${language}
${reviewResult.refactoredCode || '// No refactored code'}
\`\`\`

---

## Unit Tests

\`\`\`${language}
${reviewResult.unitTests || '// No unit tests'}
\`\`\`
`;
  };

  const generateJsonReport = () => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      language,
      originalCode,
      review: reviewResult
    }, null, 2);
  };

  const reportContent = exportFormat === 'markdown' ? generateMarkdownReport() : generateJsonReport();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: exportFormat === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `review-report.${exportFormat === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 border-border/60 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FolderDown className="size-3.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                Export Code Review
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Download or copy the full inspection report and generated tests.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Format Selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-muted-foreground">Output Format</span>
          <div className="flex rounded-lg bg-muted/50 p-0.5 border border-border/40">
            <button
              onClick={() => setExportFormat('markdown')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                exportFormat === 'markdown' 
                  ? 'bg-background text-foreground shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Markdown (.md)
            </button>
            <button
              onClick={() => setExportFormat('json')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                exportFormat === 'json' 
                  ? 'bg-background text-foreground shadow-xs' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              JSON (.json)
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="relative rounded-lg border border-border/40 bg-background/80 overflow-hidden">
          <textarea
            readOnly
            value={reportContent}
            rows={10}
            className="w-full p-3 font-mono text-[11px] leading-relaxed text-foreground/90 bg-transparent resize-none outline-none"
          />
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs gap-1.5">
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            <span>{copied ? 'Copied' : 'Copy Report'}</span>
          </Button>
          <Button size="sm" onClick={handleDownload} className="text-xs gap-1.5">
            <Download className="size-3" />
            <span>Download</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
