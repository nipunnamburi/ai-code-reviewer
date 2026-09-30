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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GitPullRequest, ArrowRight, Loader2, GitCommit } from 'lucide-react';
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

  const handleOpenChange = (open) => {
    if (!open) onClose();
  };

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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 border-border/60 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <GitPullRequest className="size-3.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                Import GitHub Pull Request
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Fetch PR changed files & diff directly into the editor for automated review.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Pull Request URL
            </label>
            <div className="flex gap-2">
              <Input 
                type="text"
                placeholder="https://github.com/fastapi/fastapi/pull/12345"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFetch();
                }}
                className="text-xs bg-background/50 border-input/60 h-9"
              />
              <Button 
                onClick={handleFetch}
                disabled={loading || !prUrl.trim()}
                size="sm"
                className="h-9 px-3 text-xs gap-1.5 shrink-0"
              >
                {loading && <Loader2 className="size-3 animate-spin" />}
                <span>{loading ? 'Fetching...' : 'Fetch PR'}</span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg text-xs text-destructive">
              {error}
            </div>
          )}

          {prData && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{prData.files?.length || 0} modified file(s) in {prData.owner}/{prData.repo} #{prData.pr_number}:</span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {prData.files?.map((file, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectFile(file)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/60 hover:bg-muted/40 hover:border-border cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <GitCommit className="size-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-foreground truncate">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-medium text-emerald-400">+{file.additions}</span>
                      <span className="text-[11px] font-mono font-medium text-rose-400">-{file.deletions}</span>
                      <ArrowRight className="size-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
