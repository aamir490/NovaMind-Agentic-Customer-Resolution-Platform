import { useEffect, useRef, useState } from 'react';

const rejectedMessages = {
  PROVIDER_UNAVAILABLE: 'The run provider is unavailable. No run was started.',
  RUN_CAPACITY_UNAVAILABLE: 'The service cannot accept another run right now. No run was started.',
  RUN_RETENTION_FULL: 'The service has reached its run limit. No run was started.',
  CONVERSATION_UNAVAILABLE: 'Conversation storage is unavailable. No run was started.',
};

export default function AIWorkspace({ api, identity }) {
  const [cases, setCases] = useState(null);
  const [caseId, setCaseId] = useState('');
  const [message, setMessage] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);
  const [caseError, setCaseError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const mounted = useRef(false);
  const caseRequest = useRef(false);
  const submitted = useRef(false);
  const locked = attempt !== null && attempt.state !== 'rejected';

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function loadCases() {
    if (!api || caseRequest.current || submitted.current) return;
    caseRequest.current = true;
    setLoadingCases(true); setCaseError(''); setCases(null); setCaseId('');
    try {
      const records = await api.listCases();
      if (!Array.isArray(records) || !records.every((record) => record && typeof record.id === 'string'
          && typeof record.subject === 'string')) throw new Error('Invalid case list');
      if (mounted.current) setCases(records);
    } catch {
      if (mounted.current) setCaseError('Cases could not be loaded. Check your access and the local API, then refresh.');
    } finally {
      caseRequest.current = false;
      if (mounted.current) setLoadingCases(false);
    }
  }

  async function startRun(event) {
    event.preventDefault();
    if (!api || !identity || identity.provider === 'unavailable' || submitted.current || caseRequest.current
        || !cases?.some((record) => record.id === caseId) || !message.trim() || message.length > 8000) return;
    const body = { instance_id: identity.instance_id, request_id: crypto.randomUUID(),
      case_id: caseId, message: message.trim() };
    // A ref closes the double-click window before React commits disabled controls.
    submitted.current = true;
    setAttempt({ state: 'sending', body });
    try {
      const snapshot = await api.startRun(body);
      if (mounted.current) setAttempt({ state: 'accepted', body, snapshot });
    } catch (error) {
      if (!mounted.current) return;
      const knownUnavailable = error.status === 503 && Object.hasOwn(rejectedMessages, error.code);
      const rejected = [401, 403, 404, 422].includes(error.status) || knownUnavailable;
      // A timeout, malformed success, conflict, or unexpected service error could
      // follow acceptance. Preserve its request ID and never offer blind replay.
      submitted.current = !rejected;
      setAttempt({ state: rejected ? 'rejected' : 'uncertain', body,
        error: knownUnavailable ? rejectedMessages[error.code]
          : rejected ? 'The API rejected this request. Check case access and message inputs before submitting again.'
            : error.code === 'INSTANCE_CHANGED_DO_NOT_REPLAY'
              ? 'The server instance changed. Do not replay this submission; confirm your identity again and inspect existing records first.'
              : 'The submission outcome is uncertain. A run may have started. Do not resubmit; inspect backend records using the request ID below.' });
    }
  }

  if (!api || !identity) return <section className="view-placeholder" aria-labelledby="ai-signin-title">
    <p className="eyebrow">AI Workspace</p>
    <h2 id="ai-signin-title">Confirm your identity to start a run.</h2>
    <p>Use the existing token form above. Case access and run permissions are checked by the backend.</p>
  </section>;

  const snapshot = attempt?.snapshot;
  return <div className="ai-workspace">
    <form className="case-panel" aria-labelledby="run-request-title" onSubmit={startRun}>
      <div className="case-panel-heading">
        <div><p className="eyebrow">Case-bound request</p><h2 id="run-request-title">Start a resolution run</h2></div>
        <span className="badge">{identity.provider === 'local_scripted' ? 'Local scripted provider' : 'Provider unavailable'}</span>
      </div>
      <p className="case-caption">Starts a real workflow for the selected case. It may create a proposal for human review. No business action is executed.</p>
      {identity.provider === 'unavailable' && <p className="run-notice" role="status">The run provider is unavailable. Confirm your identity again after the service becomes available.</p>}
      <button type="button" className="button-secondary" disabled={loadingCases || locked} onClick={loadCases}>
        {loadingCases ? 'Loading cases…' : 'Refresh cases'}
      </button>
      {caseError && <p className="run-error" role="alert">{caseError}</p>}
      {cases?.length === 0 && <p className="case-caption" role="status">No cases were returned for your identity.</p>}
      <fieldset disabled={loadingCases || locked}>
        <label>Support case<select required value={caseId} onChange={(event) => setCaseId(event.target.value)}>
          <option value="">{cases === null ? 'Refresh cases to begin' : 'Choose a case'}</option>
          {cases?.map((record) => <option key={record.id} value={record.id}>{record.subject} — {record.id}</option>)}
        </select></label>
        <label>Request message<textarea required rows={5} maxLength={8000} value={message}
          aria-describedby="run-message-help" onChange={(event) => setMessage(event.target.value)} /></label>
        <p id="run-message-help" className="case-caption">Describe the support request. Maximum 8,000 characters. The case ID comes from your selection.</p>
        <button type="submit" disabled={identity.provider === 'unavailable' || !caseId || !message.trim()}>
          {attempt?.state === 'sending' ? 'Submitting request…' : attempt?.state === 'accepted' ? 'Request submitted' : 'Start run'}
        </button>
      </fieldset>
      <p className="run-footnote">Leaving this view does not stop a submitted run. If the response is lost, do not create another submission for the same request.</p>
    </form>

    <section className="case-panel" aria-labelledby="run-snapshot-title">
      <div className="case-panel-heading">
        <div><p className="eyebrow">Server response</p><h2 id="run-snapshot-title">Returned run snapshot</h2></div>
        {snapshot && <span className="case-status">{snapshot.status}</span>}
      </div>
      {!attempt && <p className="case-caption">No run has been submitted from this workspace.</p>}
      {attempt?.state === 'sending' && <p role="status" className="case-caption">Waiting for the start request response. Run status has not been confirmed.</p>}
      {attempt?.error && <p className="run-error" role="alert">{attempt.error}</p>}
      {attempt && <dl className="case-facts run-identifiers">
        <div><dt>Request ID</dt><dd>{attempt.body.request_id}</dd></div>
        <div><dt>Case ID</dt><dd>{attempt.body.case_id}</dd></div>
        <div><dt>Server instance ID</dt><dd>{attempt.body.instance_id}</dd></div>
      </dl>}
      {snapshot && <>
        <p className="run-notice" role="status">Returned status: {snapshot.status}. This snapshot is from the start response and does not refresh automatically.</p>
        <dl className="case-facts run-identifiers">
          <div><dt>Run ID</dt><dd>{snapshot.run_id}</dd></div>
          {snapshot.workflow_id && <div><dt>Workflow ID</dt><dd>{snapshot.workflow_id}</dd></div>}
          {snapshot.conversation_id && <div><dt>Conversation ID</dt><dd>{snapshot.conversation_id}</dd></div>}
          <div><dt>Provider</dt><dd>Local scripted provider</dd></div>
          <div><dt>Created at (server)</dt><dd><time dateTime={snapshot.created_at}>{snapshot.created_at}</time></dd></div>
          <div><dt>Updated at (server)</dt><dd><time dateTime={snapshot.updated_at}>{snapshot.updated_at}</time></dd></div>
          {snapshot.trace_id && <div><dt>Trace ID</dt><dd>{snapshot.trace_id}</dd></div>}
          <div><dt>Actions executed</dt><dd>{snapshot.actions_executed ? 'Yes' : 'No'}</dd></div>
        </dl>
        {snapshot.message && <p className="run-message">{snapshot.message}</p>}
        {snapshot.error && <p className="run-error" role="alert">Backend error: {snapshot.error}</p>}
        <p className="run-footnote">No polling or live progress is shown. Approval does not execute an action.</p>
      </>}
    </section>
  </div>;
}
