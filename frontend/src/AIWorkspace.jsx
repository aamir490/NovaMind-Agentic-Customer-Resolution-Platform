import { useEffect, useRef, useState } from 'react';
import KnowledgeEvidence from './KnowledgeEvidence.jsx';

const rejectedMessages = {
  PROVIDER_UNAVAILABLE: 'The run provider is unavailable. No run was started.',
  RUN_CAPACITY_UNAVAILABLE: 'The service cannot accept another run right now. No run was started.',
  RUN_RETENTION_FULL: 'The service has reached its run limit. No run was started.',
  CONVERSATION_UNAVAILABLE: 'Conversation storage is unavailable. No run was started.',
};
const activeRunStatuses = new Set(['RUNNING', 'RESUMING']);
const maxDisplayedEvents = 256;
const runStates = {
  RUNNING: { label: 'Running', detail: 'The workflow is in progress.', tone: 'active' },
  RESUMING: { label: 'Resuming', detail: 'The workflow is resuming.', tone: 'active' },
  REVIEW_REQUIRED: { label: 'Waiting for human review', detail: 'The workflow is paused for human review. No decision can be submitted from this workspace.', tone: 'waiting' },
  REVIEWED: { label: 'Review recorded', detail: 'Human review has been recorded. This does not mean a business action was executed.', tone: 'waiting' },
  COMPLETED: { label: 'Completed', detail: 'The workflow has finished. Its confirmed response and activity are shown below.', tone: 'complete' },
  FAILED: { label: 'Failed', detail: 'The workflow has stopped with a failure. Its last confirmed response and activity remain available below.', tone: 'error' },
};

function trackingError(error) {
  if (error.status === 401) return 'Your session could not be verified. Live tracking has stopped. Confirm your identity before checking existing records.';
  if (error.status === 403) return 'Access to this run was denied. Live tracking has stopped.';
  if (error.status === 404) return 'This run is no longer available. It may have been lost after a server restart. Do not resubmit automatically.';
  if (error.status === 409) return 'The run or event cursor is no longer valid. Tracking has stopped; inspect existing records before submitting again.';
  return 'Live updates could not be verified. The last confirmed status and events are shown. Retry live tracking to check this same run. This does not cancel or resubmit the run.';
}

export default function AIWorkspace({ api, identity }) {
  const [cases, setCases] = useState(null);
  const [caseId, setCaseId] = useState('');
  const [message, setMessage] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);
  const [caseError, setCaseError] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [trackingRetry, setTrackingRetry] = useState(0);
  const [retryingTracking, setRetryingTracking] = useState(false);
  const lastTracking = useRef(null);
  const mounted = useRef(false);
  const caseRequest = useRef(false);
  const submitted = useRef(false);
  const trackingRetryRequest = useRef(false);
  const locked = attempt !== null && attempt.state !== 'rejected';

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!api || attempt?.state !== 'accepted') return;
    const binding = attempt.snapshot;
    const controller = new AbortController();
    const { signal } = controller;
    let timer;
    let current = lastTracking.current?.snapshot.run_id === binding.run_id ? lastTracking.current
      : { snapshot: binding, events: [], after: 0, gap: false, trimmed: false };

    function publish(changes) {
      if (signal.aborted) return;
      current = { ...current, ...changes };
      lastTracking.current = current;
      setTracking(current);
    }

    function checkSnapshot(snapshot) {
      if (snapshot.last_sequence < current.snapshot.last_sequence
          || Date.parse(snapshot.updated_at) < Date.parse(current.snapshot.updated_at)) {
        throw new Error('Stale run snapshot');
      }
    }

    async function poll() {
      try {
        const snapshot = await api.runSnapshot(binding, { signal });
        if (signal.aborted) return;
        checkSnapshot(snapshot);
        publish({ snapshot });
        let page;
        do {
          page = await api.runEvents(binding, current.after, { signal });
          if (signal.aborted) return;
          checkSnapshot(page.snapshot);
          // The API validator enforces contiguous, increasing sequences after
          // this cursor, except for explicitly reported retention gaps.
          const events = [...current.events, ...page.events];
          publish({ snapshot: page.snapshot, after: page.next_after,
            events: events.slice(-maxDisplayedEvents), gap: current.gap || page.gap,
            trimmed: current.trimmed || events.length > maxDisplayedEvents });
        } while (page.has_more);
        // Drain available history before stopping at terminal/review states.
        // Scheduling after completion prevents overlapping requests.
        if (activeRunStatuses.has(current.snapshot.status)) timer = setTimeout(poll, 1500);
        else publish({ phase: 'stopped' });
      } catch (error) {
        if (signal.aborted) return;
        publish({ phase: 'error', error: trackingError(error),
          canRetry: ![401, 403, 404, 409].includes(error.status) });
      } finally {
        if (!signal.aborted) {
          trackingRetryRequest.current = false;
          setRetryingTracking(false);
        }
      }
    }

    publish({ phase: 'polling', error: '', canRetry: false });
    poll();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [api, attempt, trackingRetry]);

  function retryTracking() {
    if (!tracking?.canRetry || trackingRetryRequest.current) return;
    trackingRetryRequest.current = true;
    setRetryingTracking(true);
    setTrackingRetry((value) => value + 1);
  }

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

  const snapshot = tracking?.snapshot ?? attempt?.snapshot;
  const runState = snapshot ? runStates[snapshot.status] : null;
  const submitting = attempt?.state === 'sending';
  const caseHelp = loadingCases ? 'Loading cases available to your identity…'
    : caseError ? 'Cases are unavailable. Refresh cases to try again.'
      : cases === null ? 'Load your available cases to begin.'
        : cases.length === 0 ? 'No cases are available for your identity. You can refresh to check again.'
          : `${cases.length} ${cases.length === 1 ? 'case is' : 'cases are'} available. Select one for this request.`;
  const submitHelp = submitting ? 'Submission in progress. Please wait; another request cannot be sent.'
    : attempt?.state === 'uncertain' ? 'Submission is locked because a run may have started. Use the request ID to check existing records before taking further action.'
      : attempt?.state === 'accepted' ? 'This request has been submitted. Follow its confirmed status in the run panel.'
        : identity.provider === 'unavailable' ? 'Starting a run is unavailable until the provider is available.'
          : loadingCases ? 'Wait for cases to finish loading before submitting.'
            : !caseId ? 'Select an available case to enable submission.'
              : !message.trim() ? 'Enter a request message to enable submission.'
                : 'Ready to submit this request for the selected case.';
  const statusLabel = runState?.label ?? (submitting ? 'Submitting request'
    : attempt?.state === 'uncertain' ? 'Submission not confirmed'
      : attempt?.state === 'rejected' ? 'Request not started' : 'No run yet');
  const statusDetail = snapshot ? `${runState.detail} ${tracking?.phase === 'error'
    ? 'Live tracking is stopped; this is the last confirmed status.'
    : tracking?.phase === 'stopped' ? 'Automatic tracking has stopped.'
      : retryingTracking ? 'Reconnecting to live tracking…'
        : activeRunStatuses.has(snapshot.status) ? 'Live tracking is checking for updates.'
          : 'Loading the remaining workflow events…'}`
    : submitting ? 'Waiting for the API to confirm the request. A run has not yet been confirmed.'
      : attempt?.state === 'uncertain' ? 'A run may have started. Submission remains locked to prevent a duplicate.'
        : attempt?.state === 'rejected' ? 'Review the error below and your request before trying again.'
          : 'Load cases, select a case, and enter a request. Confirmed run details will appear here after submission.';
  const toolEvents = tracking?.events.filter((event) => event.kind === 'TOOL') ?? [];
  const review = snapshot?.review;
  const proposalReferences = [...new Set(toolEvents.map((event) => event.proposal_id).filter(Boolean))]
    .filter((id) => id !== review?.proposal_id);
  return <div className="ai-workspace">
    <form className="case-panel" aria-labelledby="run-request-title" onSubmit={startRun}>
      <div className="case-panel-heading">
        <div><p className="eyebrow">Case-bound request</p><h2 id="run-request-title">Start a resolution run</h2></div>
        <span className="badge">{identity.provider === 'local_scripted' ? 'Local scripted provider' : 'Provider unavailable'}</span>
      </div>
      <p className="case-caption">Starts a real workflow for the selected case. It may create a proposal for human review. No business action is executed.</p>
      {identity.provider === 'unavailable' && <p className="run-notice" role="status">The run provider is unavailable. Confirm your identity again after the service becomes available.</p>}
      <button type="button" className="button-secondary" disabled={loadingCases || locked}
        aria-busy={loadingCases} aria-describedby={locked ? 'run-submit-help' : 'run-case-help'} onClick={loadCases}>
        {loadingCases ? 'Loading cases…' : cases === null && !caseError ? 'Load cases' : 'Refresh cases'}
      </button>
      <p id="run-case-help" className="case-caption run-control-help" role="status" aria-atomic="true">{caseHelp}</p>
      {caseError && <p className="run-error" role="alert">{caseError}</p>}
      <fieldset disabled={loadingCases || locked} aria-busy={loadingCases || submitting}>
        <legend className="sr-only">Resolution run request</legend>
        <label>Support case<select required value={caseId} disabled={!cases?.length}
          aria-describedby="run-case-help" onChange={(event) => setCaseId(event.target.value)}>
          <option value="">{loadingCases ? 'Loading cases…' : caseError ? 'Cases unavailable'
            : cases === null ? 'Load cases to begin' : cases.length === 0 ? 'No cases available' : 'Choose a case'}</option>
          {cases?.map((record) => <option key={record.id} value={record.id}>{record.subject} — {record.id}</option>)}
        </select></label>
        <label>Request message<textarea required rows={5} maxLength={8000} value={message}
          aria-describedby="run-message-help" onChange={(event) => setMessage(event.target.value)} /></label>
        <p id="run-message-help" className="case-caption">Describe the support request. Maximum 8,000 characters. The case ID comes from your selection.</p>
        <button type="submit" disabled={loadingCases || locked || identity.provider === 'unavailable' || !caseId || !message.trim()}
          aria-busy={submitting} aria-describedby="run-submit-help">
          {submitting ? 'Submitting request…' : attempt?.state === 'accepted' ? 'Request submitted'
            : attempt?.state === 'uncertain' ? 'Submission locked' : 'Start run'}
        </button>
      </fieldset>
      <p id="run-submit-help" className="case-caption run-control-help">{submitHelp}</p>
      <p className="run-footnote">Leaving this view does not stop a submitted run. If the response is lost, do not create another submission for the same request.</p>
    </form>

    <section className="case-panel" aria-labelledby="run-snapshot-title">
      <div className="case-panel-heading">
        <div><p className="eyebrow">Live workflow</p><h2 id="run-snapshot-title">Run status and events</h2></div>
        {snapshot && <span className="case-status" data-tone={runState.tone}>{runState.label}</span>}
      </div>
      <div className="run-state-summary" role="status" aria-atomic="true"
        data-tone={attempt?.error || tracking?.error ? 'error' : runState?.tone ?? (submitting ? 'active' : 'idle')}>
        <h3>{snapshot ? `Last confirmed: ${statusLabel}` : statusLabel}</h3>
        <p>{statusDetail}</p>
      </div>
      {attempt?.error && <p className="run-error" role="alert">{attempt.error}</p>}
      {attempt && <dl className="case-facts run-identifiers">
        <div><dt>Request ID</dt><dd>{attempt.body.request_id}</dd></div>
        <div><dt>Case ID</dt><dd>{attempt.body.case_id}</dd></div>
        <div><dt>Server instance ID</dt><dd>{attempt.body.instance_id}</dd></div>
      </dl>}
      {snapshot && <>
        {tracking?.error && <p className="run-error" role="alert">{tracking.error}</p>}
        {(tracking?.canRetry || retryingTracking) && <button type="button" className="button-secondary"
          disabled={retryingTracking} aria-busy={retryingTracking} aria-describedby="run-tracking-help"
          onClick={retryTracking}>{retryingTracking ? 'Reconnecting…' : 'Retry live tracking'}</button>}
        <dl className="case-facts run-identifiers">
          <div><dt>Run ID</dt><dd>{snapshot.run_id}</dd></div>
          {snapshot.workflow_id && <div><dt>Workflow ID</dt><dd>{snapshot.workflow_id}</dd></div>}
          {snapshot.conversation_id && <div><dt>Conversation ID</dt><dd>{snapshot.conversation_id}</dd></div>}
          <div><dt>Provider</dt><dd>Local scripted provider</dd></div>
          <div><dt>Created at (server)</dt><dd><time dateTime={snapshot.created_at}>{snapshot.created_at}</time></dd></div>
          <div><dt>Updated at (server)</dt><dd><time dateTime={snapshot.updated_at}>{snapshot.updated_at}</time></dd></div>
          {snapshot.trace_id && <div><dt>Trace ID</dt><dd>{snapshot.trace_id}</dd></div>}
        </dl>
        <section className="run-event-section response-proposal" aria-labelledby="response-proposal-title">
          <h3 id="response-proposal-title">Response &amp; Proposal</h3>
          <p className="case-caption">Details from the last confirmed backend snapshot and received events.</p>
          <div className="resolution-card">
            <h4>AI response</h4>
            <p className="case-caption">{snapshot.status === 'COMPLETED' ? 'Final customer-facing response' : 'Last returned customer-facing message'}</p>
            {snapshot.message ? <p className="run-message">{snapshot.message}</p>
              : <p className="case-caption">No customer-facing response has been returned yet.</p>}
          </div>
          <div className="resolution-card">
            <h4>Proposed action</h4>
            {review ? <>
              <p className="proposal-action">{review.action}</p>
              <dl className="case-facts run-identifiers">
                <div><dt>Proposal ID</dt><dd>{review.proposal_id}</dd></div>
              </dl>
              <p className="eyebrow">Proposal rationale</p>
              <p className="run-message">{review.rationale}</p>
            </> : <p className="case-caption">No proposed action details have been returned.</p>}
            {proposalReferences.length > 0 && <>
              <p className="case-caption">Proposal references reported by tool events; action and review details are not available for these references.</p>
              <ul className="proposal-references">{proposalReferences.map((id) => <li key={id}><code>{id}</code></li>)}</ul>
            </>}
            {(tracking?.gap || tracking?.trimmed) && <p className="case-caption">Event history is incomplete; earlier proposal references may be missing.</p>}
          </div>
          <div className="resolution-card">
            <h4>Human review</h4>
            {snapshot.status === 'REVIEW_REQUIRED' && <p className="run-notice">The backend reports that human review is required.</p>}
            {snapshot.status === 'REVIEWED' && <p className="case-caption">The backend reports that human review was recorded.</p>}
            {review || snapshot.reviewed_status ? <dl className="case-facts">
              {review && <>
                <div><dt>Review request status (when issued)</dt><dd>{review.status}</dd></div>
                <div><dt>Review ID</dt><dd><code>{review.review_id}</code></dd></div>
              </>}
              <div><dt>Recorded review outcome</dt><dd>{snapshot.reviewed_status ?? 'Not reported'}</dd></div>
            </dl> : <p className="case-caption">No review request details or decision have been returned.</p>}
            <p className="case-caption">A proposed action or an approval does not mean an action was executed.</p>
          </div>
          <div className="resolution-card">
            <h4>Action &amp; error state</h4>
            {snapshot.actions_executed === false && <p className="run-notice">No business action was executed.</p>}
            {snapshot.status === 'FAILED' && <p className="run-error">The run has failed.</p>}
            {snapshot.error ? <p className="run-error">The backend reported an error for this run. Use the run ID when seeking support.</p>
              : <p className="case-caption">No backend error is reported in this snapshot.</p>}
          </div>
        </section>
        <KnowledgeEvidence tracking={tracking} />
        <section className="run-event-section tool-activity" aria-labelledby="tool-activity-title">
          <div className="tool-activity-heading">
            <h3 id="tool-activity-title">Tool Activity</h3>
            <span className="badge">{toolEvents.length} retained events</span>
          </div>
          {(tracking?.gap || tracking?.trimmed) && <p className="case-caption">This section reflects retained workflow events. Earlier tool activity may be missing.</p>}
          {toolEvents.length === 0 ? <p className="case-caption">No tool activity has been received for this run.</p>
            : <ol className="tool-activity-list" aria-label="Tool activity in sequence order" tabIndex={0}>
              {toolEvents.map((event) => {
                const outcome = event.ok === true ? 'success' : event.ok === false ? 'failure' : 'unknown';
                return <li key={event.sequence} className={`tool-activity-item ${outcome}`}>
                  <div className="tool-activity-card">
                    <div className="tool-activity-heading">
                      <strong className="tool-activity-name">{event.tool || 'Tool name unavailable'}</strong>
                      <span className="tool-activity-outcome">{event.ok === true ? 'Succeeded'
                        : event.ok === false ? 'Failed' : 'Outcome not reported'}</span>
                    </div>
                    <div className="tool-activity-meta">
                      <span>Sequence #{event.sequence}</span>
                      <span>Status: {event.state}</span>
                    </div>
                    <time dateTime={event.timestamp}>{event.timestamp}</time>
                  </div>
                </li>;
              })}
            </ol>}
        </section>
        <section className="run-event-section" aria-labelledby="run-events-title">
          <h3 id="run-events-title">Workflow Events</h3>
          {tracking?.gap && <p className="run-notice">Some events are no longer retained by the backend. This history has a gap.</p>}
          {tracking?.trimmed && <p className="case-caption">Showing the latest {maxDisplayedEvents} received events.</p>}
          {!tracking?.events.length && <p className="case-caption">{tracking?.phase === 'error'
            ? 'No workflow events have been received. Live tracking is stopped.'
            : tracking?.phase === 'stopped' ? 'No workflow events were returned for this run.'
              : 'Waiting for workflow events…'}</p>}
          {tracking?.events.length > 0 && <ol className="run-events" aria-label="Workflow events in sequence order" tabIndex={0}>
            {tracking.events.map((event) => <li key={event.sequence}>
              <div className="run-event-heading">
                <strong>#{event.sequence} {event.kind === 'STATE' ? 'Run status'
                  : event.kind === 'NODE' ? (event.node?.replaceAll('_', ' ') ?? 'Workflow node')
                    : (event.tool ?? 'Tool')}</strong>
                <span className="badge">{event.state}</span>
              </div>
              <time dateTime={event.timestamp}>{event.timestamp}</time>
              {event.ok !== null && <p className="case-caption">{event.ok ? 'Tool succeeded' : 'Tool failed'}</p>}
              {event.error && <p className="run-error">An error was reported for this event. Use the run ID and event sequence when seeking support.</p>}
            </li>)}
          </ol>}
        </section>
        <p id="run-tracking-help" className="run-footnote">Only backend-reported status and events are shown. Retrying tracking reads this run without submitting another request. Approval does not execute an action.</p>
      </>}
    </section>
  </div>;
}
