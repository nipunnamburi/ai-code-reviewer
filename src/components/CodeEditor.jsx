import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Trash2, 
  Copy, 
  Upload, 
  Check, 
  Sparkles,
  FileCode2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'sql', name: 'SQL' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'html', name: 'HTML' },
  { id: 'json', name: 'JSON' }
];

export function CodeEditor({
  code,
  onChangeCode,
  language,
  onChangeLanguage,
  onRunReview,
  isReviewing
}) {
  const [copied, setCopied] = React.useState(false);
  const fileInputRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Clear the code editor?')) {
      onChangeCode('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onChangeCode(content);

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'py') onChangeLanguage('python');
        else if (ext === 'ts' || ext === 'tsx') onChangeLanguage('typescript');
        else if (ext === 'js' || ext === 'jsx') onChangeLanguage('javascript');
        else if (ext === 'sql') onChangeLanguage('sql');
        else if (ext === 'java') onChangeLanguage('java');
        else if (ext === 'go') onChangeLanguage('go');
        else if (ext === 'rs') onChangeLanguage('rust');
        else if (ext === 'cpp' || ext === 'c') onChangeLanguage('cpp');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code ? code.length : 0;

  return (
    <div className="flex flex-col h-full bg-background border-r border-border/40 overflow-hidden relative">
      {/* Editor Toolbar */}
      <div className="h-11 px-4 border-b border-border/40 bg-card/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <FileCode2 className="size-3.5 text-primary" />
            <span>Source Code</span>
          </div>
          <select 
            className="h-7 rounded-md border border-input/60 bg-background/50 px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors hover:border-border cursor-pointer"
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value)}
            aria-label="Select Source Language"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id} className="bg-popover text-foreground">
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right action tools */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-muted-foreground mr-1 tabular-nums">
            {lineCount} lines • {charCount} chars
          </span>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden"
            onChange={handleFileUpload} 
          />

          <Button 
            variant="ghost" 
            size="icon-xs"
            onClick={() => fileInputRef.current?.click()}
            title="Upload code file"
            aria-label="Upload code file"
            className="text-muted-foreground hover:text-foreground"
          >
            <Upload className="size-3.5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon-xs"
            onClick={handleCopy}
            title="Copy code"
            aria-label="Copy code"
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon-xs"
            onClick={handleClear}
            title="Clear editor"
            aria-label="Clear editor"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-3.5 mx-0.5 opacity-50" />

          {/* Primary Review Action */}
          <Button 
            variant="default"
            size="sm"
            onClick={onRunReview}
            disabled={isReviewing || !code.trim()}
            className="h-7 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
          >
            <Sparkles className="size-3 text-primary-foreground" />
            <span>{isReviewing ? 'Analyzing...' : 'Run Review'}</span>
          </Button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={language === 'react' ? 'javascript' : language}
          value={code}
          onChange={(value) => onChangeCode(value || '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            wordWrap: 'on'
          }}
          loading={
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
