import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import App from './App';
import './styles/index.css';

function Root() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    // Exclude Monaco Editor containers from Lenis interception
    lenis.options.prevent = (node) => {
      return Boolean(
        node?.classList?.contains('monaco-editor') ||
        node?.closest?.('.monaco-editor') ||
        node?.closest?.('.monaco-diff-editor')
      );
    };

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
