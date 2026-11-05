import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Trash2, 
  Copy, 
  Upload, 
  Check, 
  Sparkles,
  FileCode2,
  Terminal,
  Play
} from 'lucide-react';

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
  isReviewing,
  reviewMode
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

  const handleEditorDidMount = (editor, monaco) => {
    try {
      monaco.editor.defineTheme('hallmark-terminal', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '668870', fontStyle: 'italic' },
          { token: 'keyword', foreground: '87e08c', fontStyle: 'bold' },
          { token: 'string', foreground: 'b8e986' },
          { token: 'number', foreground: '5dfc7c' },
          { token: 'identifier', foreground: 'd4ebd8' },
          { token: 'type', foreground: 'a3e635' },
        ],
        colors: {
          'editor.background': '#141c16',
          'editor.foreground': '#e2f2e5',
          'editorLineNumber.foreground': '#344c3b',
          'editorLineNumber.activeForeground': '#87e08c',
          'editorCursor.foreground': '#87e08c',
          'editor.lineHighlightBackground': '#18241b',
          'editor.selectionBackground': '#223827',
          'editorIndentGuide.background': '#1f3024',
          'editorIndentGuide.activeBackground': '#3b5e44',
        }
      });
      monaco.editor.setTheme('hallmark-terminal');
    } catch {
      // Fallback if monaco already themed
    }
  };

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code ? code.length : 0;

  return (
    <div className="flex flex-col h-full bg-[var(--color-paper)] border-r border-[var(--color-rule)] overflow-hidden relative font-mono">
      {/* Editor Top Toolbar */}
      <div className="h-10 px-3 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]">
            <FileCode2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>source_code</span>
          </div>
          
          <select 
            className="h-6 bg-[var(--color-paper)] border border-[var(--color-rule-2)] px-2 text-[11px] text-[var(--color-ink)] focus:outline-none cursor-pointer"
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value)}
            aria-label="Select Source Language"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id} className="bg-[var(--color-paper-2)] text-[var(--color-ink)]">
                {lang.name}
              </option>
            ))}
          </select>

          <span className="text-[10px] text-[var(--color-muted)] pl-1">
            {lineCount} lines · {charCount} chars
          </span>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-1.5">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".py,.js,.jsx,.ts,.tsx,.sql,.java,.cpp,.c,.go,.rs,.html,.json"
          />
          <button 
            type="button"
            className="p-1 border border-transparent hover:border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Local File"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <button 
            type="button"
            className="p-1 border border-transparent hover:border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            onClick={handleCopy}
            title="Copy Buffer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button 
            type="button"
            className="p-1 border border-transparent hover:border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            onClick={handleClear}
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-[var(--color-rule)] mx-1" />

          {/* Primary Review Execution Button */}
          <button
            type="button"
            onClick={onRunReview}
            disabled={isReviewing || !code.trim()}
            className="btn-terminal-primary"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isReviewing ? 'auditing...' : 'run review'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Pane */}
      <div className="flex-1 relative overflow-hidden bg-[var(--color-paper)]">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => onChangeCode(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Martian Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            renderLineHighlight: 'all',
            cursorBlinking: 'solid',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
