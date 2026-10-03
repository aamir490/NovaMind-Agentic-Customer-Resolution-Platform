import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import CaseReview from './CaseReview.jsx';
import AIWorkspace from './AIWorkspace.jsx';
import { createApi } from './api.js';

const views = [
  { id: 'dashboard', label: 'Dashboard', title: 'Dashboard',
    description: 'A place for your workspace overview.',
    placeholder: 'Dashboard summaries are not available yet. Open Cases to review a support case.',
    icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
  { id: 'cases', label: 'Cases', title: 'Case review',
    description: 'Customer context, policy, and eligibility. One place to review the details.',
    icon: 'M4 5h16v15H4zM9 5V3h6v2M8 10h8M8 14h5' },
  { id: 'ai-workspace', label: 'AI Workspace', title: 'AI Workspace',
    description: 'Submit a case-bound request and inspect the returned run snapshot.',
    icon: 'M5 4h14v12H9l-4 4zM8 8h8M8 12h5' },
  { id: 'reviews', label: 'Reviews', title: 'Reviews',
    description: 'A place for human review.',
    placeholder: 'The review queue is not available yet. No approval or rejection controls are connected here.',
    icon: 'M9 4H5v17h14V4h-4M9 3h6v4H9zM8 13l3 3 5-6' },
  { id: 'audit', label: 'Audit', title: 'Audit',
    description: 'A place for review history and audit records.',
    placeholder: 'Audit records are not available in this view yet. No diagnostic data is loaded here.',
    icon: 'M5 3h10l4 4v14H5zM14 3v5h5M9 12h6M9 16h6' },
];

function App() {
  const [health, setHealth] = useState('idle');
  const [activeView, setActiveView] = useState('cases');
  const [session, setSession] = useState(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [identityStatus, setIdentityStatus] = useState('signed-out');
  const [identityMessage, setIdentityMessage] = useState('Enter your existing local access token to confirm your identity.');
  const identityClient = useRef(null);
  const view = views.find((entry) => entry.id === activeView);

  function clearIdentity() {
    identityClient.current?.dispose();
    identityClient.current = null;
    setSession(null);
    // Drop case data across identities; ordinary view navigation still preserves it.
    setSessionVersion((version) => version + 1);
  }

  function signOut() {
    clearIdentity();
    setIdentityStatus('signed-out');
    setIdentityMessage('Signed out locally. Credentials and workspace data have been cleared. Submitted runs are not cancelled.');
  }

  async function confirmIdentity(event) {
    event.preventDefault();
    if (identityStatus === 'checking') return;
    const form = event.currentTarget;
    const token = new FormData(form).get('token');
    form.reset();
    clearIdentity();
    setIdentityStatus('checking');
    setIdentityMessage('Confirming your identity with the local API…');
    const candidate = createApi(globalThis.fetch, {
      token,
      onUnauthorized() {
        if (identityClient.current !== candidate) return;
        clearIdentity();
        setIdentityStatus('error');
        setIdentityMessage('Authentication required. Enter a valid token configured for the local API.');
      },
    });
    identityClient.current = candidate;
    try {
      const identity = await candidate.identity();
      // Ignore responses from a cancelled or replaced identity request.
      if (identityClient.current !== candidate) return;
      setSession({ identity, api: candidate });
      setSessionVersion((version) => version + 1);
      setIdentityStatus('authenticated');
      setIdentityMessage('Identity confirmed by the local API.');
    } catch (error) {
      if (identityClient.current !== candidate) return;
      clearIdentity();
      setIdentityStatus('error');
      setIdentityMessage(error.status === 403
        ? 'Access denied by the local API.'
        : 'Identity could not be confirmed. Check the local API and try again.');
    }
  }

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
    idle: 'Connection not checked. Check the API when you’re ready to load case data.',
    checking: 'Checking the local API…',
    online: 'The local API is responding. This check confirms connectivity only.',
    offline: 'The local API is unavailable. Check that the backend is running, then try again.',
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <a className="brand" href="#workspace" aria-label="NovaMind workspace">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span>NovaMind<span className="brand-caption">Customer resolution</span></span>
        </a>
        <nav className="workspace-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          <div className="nav-items">
            {views.map((entry) => <button key={entry.id} type="button" className="nav-item"
              aria-current={activeView === entry.id ? 'page' : undefined}
              aria-controls="workspace" onClick={() => setActiveView(entry.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                <path d={entry.icon} />
              </svg>
              {entry.label}
              {activeView === entry.id && <span className="nav-indicator" aria-hidden="true" />}
            </button>)}
          </div>
        </nav>
        <div className="sidebar-context">
          <span className="context-symbol" aria-hidden="true">N</span>
          <div><strong>Local workspace</strong><span>Customer support</span></div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <p className="breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span>{view.label}</p>
          <span className="environment-label">Local environment</span>
        </header>
        <main id="workspace" className="workspace" tabIndex={-1}>
          <section className="identity-panel" aria-labelledby="identity-title">
            <div className="identity-heading">
              <h2 id="identity-title">Workspace identity</h2>
              <span className={`badge ${session ? 'identity-role' : ''}`}>
                {session ? session.identity.role : identityStatus === 'checking' ? 'Verifying' : 'Not signed in'}
              </span>
            </div>
            <p id="identity-status" className={`identity-status ${identityStatus}`} role="status" aria-live="polite">
              {identityMessage}
            </p>
            {session ? <div className="identity-details">
              <dl>
                <dt>User ID</dt><dd>{session.identity.user_id}</dd>
                {session.identity.customer_id && <><dt>Customer ID</dt><dd>{session.identity.customer_id}</dd></>}
              </dl>
              <button type="button" className="button-secondary" onClick={signOut}>Sign out</button>
            </div> : <form className="identity-form" onSubmit={confirmIdentity} autoComplete="off">
              <label htmlFor="local-access-token">Local access token
                <input id="local-access-token" name="token" type="password" required minLength={16} maxLength={256}
                  autoComplete="off" spellCheck={false} autoCapitalize="none" disabled={identityStatus === 'checking'}
                  aria-describedby="identity-help identity-status" />
              </label>
              <div className="identity-actions">
                <button type="submit" disabled={identityStatus === 'checking'}>
                  {identityStatus === 'checking' ? 'Verifying…' : 'Confirm identity'}
                </button>
                {identityStatus === 'checking' && <button type="button" className="button-secondary" onClick={signOut}>Cancel</button>}
              </div>
              <p id="identity-help" className="identity-help">Kept in memory for this page only. Reloading or signing out clears it.</p>
            </form>}
          </section>
          <div className="page-heading">
            <div>
              <p className="eyebrow">Customer resolution</p>
              <h1 aria-live="polite">{view.title}</h1>
              <p className="intro">{view.description}</p>
            </div>
            <span className="badge">{activeView === 'cases' ? 'Read-only workspace' : activeView === 'ai-workspace' ? 'Run submission' : 'Placeholder view'}</span>
          </div>
          {view.placeholder && <section className="view-placeholder" aria-labelledby="placeholder-title">
            <p className="eyebrow">{view.label}</p>
            <h2 id="placeholder-title">This view is not connected yet.</h2>
            <p>{view.placeholder}</p>
          </section>}
          <div hidden={activeView !== 'ai-workspace'}>
            <AIWorkspace key={sessionVersion} api={session?.api} identity={session?.identity} />
          </div>
          {/* Keep the case workspace mounted so navigation preserves an in-progress review. */}
          <div className="workspace-grid cases-layout" hidden={activeView !== 'cases'}>
            <CaseReview key={sessionVersion} api={session?.api} />
            <aside className="workspace-rail" aria-label="Workspace information">
              <section className="connection-panel" aria-labelledby="connection-title">
                <div className="panel-heading">
                  <span className="panel-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="4" y="4" width="16" height="6" rx="2" />
                      <rect x="4" y="14" width="16" height="6" rx="2" />
                      <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div><p className="eyebrow">Connection</p><h2 id="connection-title">Local API</h2></div>
                </div>
                <p className={`status ${health}`} role="status" aria-live="polite">{messages[health]}</p>
                <button className="button-secondary" onClick={checkHealth} disabled={health === 'checking'}>
                  {health === 'checking' ? 'Checking…' : 'Check local API'}
                </button>
              </section>
              <section className="guidance-panel" aria-labelledby="boundary-title">
                <p className="eyebrow">Review boundary</p>
                <h2 id="boundary-title">Evidence before action.</h2>
                <p>Eligibility is not authorization. Approval is not execution.</p>
                <span className="guidance-rule" aria-hidden="true" />
                <p className="footnote">This workspace supports read-only assessment. No business action is performed here.</p>
              </section>
            </aside>
          </div>
          <footer className="workspace-footer"><span>NovaMind<span aria-hidden="true"> / </span>Customer Resolution Platform</span><span>{activeView === 'cases' ? 'Local case review' : 'Local workspace'}</span></footer>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
