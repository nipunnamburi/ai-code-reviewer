import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Trash2, 
  Copy, 
  Upload, 
  Check, 
  Sparkles
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
    <div className="editor-workspace">
      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Source Code</span>
          <select 
            className="select-custom"
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value)}
            aria-label="Select Source Language"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right action tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginRight: '4px' }}>
            {lineCount} lines • {charCount} chars
          </span>

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />

          <button 
            className="btn-icon" 
            onClick={() => fileInputRef.current?.click()}
            title="Upload code file"
            aria-label="Upload code file"
          >
            <Upload size={14} />
          </button>

          <button 
            className="btn-icon" 
            onClick={handleCopy}
            title="Copy code"
            aria-label="Copy code"
          >
            {copied ? <Check size={14} color="var(--semantic-success)" /> : <Copy size={14} />}
          </button>

          <button 
            className="btn-icon" 
            onClick={handleClear}
            title="Clear editor"
            aria-label="Clear editor"
          >
            <Trash2 size={14} />
          </button>

          {/* Primary Review Button */}
          <button 
            className="btn-primary"
            onClick={onRunReview}
            disabled={isReviewing || !code.trim()}
          >
            <Sparkles size={13} />
            <span>{isReviewing ? 'Analyzing...' : 'Run Review'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="editor-body">
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
