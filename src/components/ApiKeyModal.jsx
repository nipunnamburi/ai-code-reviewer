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
import { Textarea } from '@/components/ui/textarea';
import { KeyRound, Sparkles } from 'lucide-react';

export function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  customPrompt,
  onSaveCustomPrompt
}) {
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [promptInput, setPromptInput] = useState(customPrompt || '');

  const handleOpenChange = (open) => {
    if (!open) onClose();
  };

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    onSaveCustomPrompt(promptInput.trim());
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    onSaveApiKey('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 border-border/60 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <KeyRound className="size-3.5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                API & Review Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure custom OpenAI key or tailor AI review instructions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              OpenAI API Key
            </label>
            <Input 
              type="password"
              placeholder="sk-proj-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="font-mono text-xs bg-background/50 border-input/60 h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              Saved strictly in your browser's localStorage or provided by server .env.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Custom Review Guidelines
            </label>
            <Textarea 
              rows={3}
              placeholder="e.g. Focus on strict concurrency safety, memory leaks, or Google style guide..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="text-xs bg-background/50 border-input/60 resize-none min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          {keyInput ? (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleClear}
              className="text-xs"
            >
              Clear Key
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs gap-1.5">
              <Sparkles className="size-3.5" />
              Save Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
