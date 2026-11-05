import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Terminal Workspace Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0e1410',
          color: '#87e08c',
          padding: '24px',
          fontFamily: "'Martian Mono', monospace",
          fontSize: '13px'
        }}>
          <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: '12px' }}>
            [FATAL] CRDT WORKSPACE INITIALIZATION EXCEPTION
          </div>
          <pre style={{
            background: '#141c16',
            border: '1px solid #364e3c',
            padding: '16px',
            color: '#e3f3e5',
            overflowX: 'auto'
          }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#87e08c',
              color: '#0d1a0f',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            $ REBOOT SESSION
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
