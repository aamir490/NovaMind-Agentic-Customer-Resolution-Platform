import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import CaseReview from './CaseReview.jsx';

function App() {
  const [health, setHealth] = useState('idle');

  async function checkHealth() {
    setHealth('checking');
    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      if (data.status !== 'ok' || data.service !== 'novamind-api') {
        throw new Error('Unexpected health response');
      }
      setHealth('online');
    } catch {
      setHealth('offline');
    }
  }

  const messages = {
    idle: 'The local API has not been checked yet.',
    checking: 'Checking the local API…',
    online: 'The local API is responding. AWS and agent capabilities are not connected.',
    offline: 'The local API is unavailable. Start FastAPI on port 8000 and use the Vite development server, then try again.',
  };

  return (
    <main>
      <header><span className="brand">NOVAMIND</span><span className="badge">V2 · PHASE 3</span></header>
      <section aria-labelledby="title">
        <p className="eyebrow">Agentic Customer Resolution Platform</p>
        <h1 id="title">Local case review.</h1>
        <p className="intro">From customer evidence to a verified outcome, with human approval where it matters.</p>
        <div className="card">
          <h2>Local development foundation</h2>
          <p>This page checks the local FastAPI connection. Local APIs support customers, orders, cases, inventory, and demonstration policy checks. Agents and action execution are not connected.</p>
          <button onClick={checkHealth} disabled={health === 'checking'}>
            {health === 'checking' ? 'Checking…' : 'Check local API'}
          </button>
          <p className={`status ${health}`} role="status" aria-live="polite">{messages[health]}</p>
        </div>
        <p className="principle">Propose → Authorize → Execute → Verify</p>
        <p className="footnote">The model may propose an action. Application rules must authorize it.</p>
      </section>
      <CaseReview />
      <footer>Learn the concepts. Explain the decisions. Verify the deployment.</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
