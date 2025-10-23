// index.tsx — React 18 runtime-guarded entry
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import * as jsxrt from 'react/jsx-runtime';

// Simple Error Boundary to catch runtime errors in the component tree.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', margin: '1rem', border: '1px solid #fca5a5', borderRadius: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Der opstod en fejl</h2>
          <p style={{ marginTop: '0.5rem' }}>Applikationen stødte på et problem og kan ikke fortsætte.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', border: '1px solid transparent', borderRadius: '0.375rem', color: 'white', backgroundColor: '#3b82f6', cursor: 'pointer' }}
          >
            Genindlæs siden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Patch console.error to filter out specific Recharts warnings about defaultProps.
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const [message, componentName] = args;

  const isDefaultPropsWarning =
    typeof message === 'string' &&
    message.startsWith('Warning:') &&
    message.includes('Support for defaultProps will be removed');

  const isRechartsComponent =
    typeof componentName === 'string' &&
    ['XAxis', 'YAxis', 'Tooltip', 'CartesianGrid', 'Bar'].includes(componentName);

  if (isDefaultPropsWarning && isRechartsComponent) {
    // Downgrade to a less intrusive console.warn and stop.
    console.warn(...args);
    return;
  }

  // For all other errors, call the original console.error
  originalConsoleError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("[BOOT] CRITICAL: #root element not found in the DOM.");
}

try {
    // --- Start of diagnostic boot check ---
    console.log('[BOOT] Render Start');
    console.groupCollapsed('▼ [BOOT] Telemetri');
    console.log('React.version:', (React as any)?.version ?? 'unknown');
    console.log('typeof React:', typeof React);
    console.log('typeof React.useRef:', typeof React.useRef);
    console.log('typeof React.createElement:', typeof React.createElement);
    const isJsxRuntimeLoaded = typeof (jsxrt as any)?.jsx === 'function';
    console.log('jsx-runtime loaded:', isJsxRuntimeLoaded ? 'Ja' : 'Nej');
    
    // Check App module sanity
    const isAppDefaultFunction = typeof App === 'function';
    console.log('App default export is function:', isAppDefaultFunction);
    console.groupEnd();
    // --- End of diagnostic boot check ---

    const root = createRoot(rootElement);
    root.render(
        <React.StrictMode>
          <ErrorBoundary>
            <HashRouter>
              <App />
            </HashRouter>
          </ErrorBoundary>
        </React.StrictMode>
    );
    console.log('[BOOT] Render End');
    console.log('[BOOT] Render OK');
} catch (err) {
    console.error('[BOOT] Render FAILED', err);
    rootElement.innerHTML = `<div style="color: red; padding: 2rem;">Boot error. Se konsollen for detaljer.</div>`;
}