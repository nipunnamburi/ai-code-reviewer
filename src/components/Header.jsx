import React from 'react';
import { 
  Code2, 
  KeyRound, 
  GitPullRequest, 
  FolderDown,
  Server,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { AI_MODELS } from '../services/aiService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  backendOnline
}) {
  const hasCustomKey = Boolean(apiKey && apiKey.trim().startsWith('sk-'));

  return (
    <header className="h-14 border-b border-border/40 bg-card/60 backdrop-blur-md px-5 flex items-center justify-between z-40 shrink-0">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shadow-primary/5">
          <Code2 className="size-4.5" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            AI Code Review Assistant
          </span>
          <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium bg-primary/5 text-primary border-primary/20 gap-1">
            <Sparkles className="size-2.5" />
            Hybrid Static + AI
          </Badge>
        </div>
      </div>

      {/* Control Buttons & Selectors */}
      <div className="flex items-center gap-2">
        {/* Backend Status indicator */}
        <Badge 
          variant={backendOnline ? "secondary" : "outline"}
          className={`h-7 px-2.5 text-xs font-normal gap-1.5 transition-colors ${
            backendOnline 
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          }`}
          title={backendOnline ? "FastAPI backend active" : "Connecting to backend..."}
        >
          <Server className="size-3 shrink-0" />
          <span>{backendOnline ? 'FastAPI Active' : 'Connecting...'}</span>
        </Badge>

        <Separator orientation="vertical" className="h-4 mx-1 opacity-50" />

        {/* Sample Templates Dropdown */}
        <select 
          className="h-8 rounded-lg border border-input/60 bg-background/50 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors hover:border-border"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onSelectSample(e.target.value);
              e.target.value = '';
            }
          }}
          aria-label="Load Sample Snippet"
        >
          <option value="" disabled className="bg-popover text-muted-foreground">Load Sample...</option>
          {samples.map(sample => (
            <option key={sample.id} value={sample.id} className="bg-popover text-foreground">
              {sample.title}
            </option>
          ))}
        </select>

        {/* GitHub PR Import Button */}
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground border-input/60 bg-background/40"
          onClick={onOpenPrModal}
        >
          <GitPullRequest className="size-3.5 text-foreground/70" />
          <span>Import PR</span>
        </Button>

        {/* Model Selector */}
        <select 
          className="h-8 rounded-lg border border-input/60 bg-background/50 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors hover:border-border"
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          aria-label="Select AI Model"
        >
          {AI_MODELS.map(m => (
            <option key={m.id} value={m.id} className="bg-popover text-foreground">
              {m.name}
            </option>
          ))}
        </select>

        <Separator orientation="vertical" className="h-4 mx-1 opacity-50" />

        {/* API Key Modal Trigger */}
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal border-input/60 bg-background/40 hover:bg-muted/40"
          onClick={onOpenApiKeyModal}
        >
          <KeyRound className="size-3.5 text-foreground/70" />
          <span>{hasCustomKey ? 'Key Configured' : 'Settings'}</span>
          {hasCustomKey && <span className="size-1.5 rounded-full bg-emerald-400"></span>}
        </Button>

        {/* Export Report */}
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 gap-1.5 text-xs font-normal border-input/60 bg-background/40 hover:bg-muted/40"
          onClick={onOpenExportModal}
        >
          <FolderDown className="size-3.5 text-foreground/70" />
          <span>Export</span>
        </Button>
      </div>
    </header>
  );
}
