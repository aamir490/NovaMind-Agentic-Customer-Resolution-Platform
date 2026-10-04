import { useCallback, useEffect, useRef, useState } from 'react';

export default function ReviewQueue({ api, identity }) {
  const allowed = Boolean(api && identity && ['REVIEWER', 'ADMIN'].includes(identity.role));
  const [state, setState] = useState({ phase: 'loading', items: [], snapshotAt: null });
  const request = useRef(null);
  const instanceId = identity?.instance_id;

  const loadQueue = useCallback(async () => {
    if (!allowed || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ phase: 'loading', items: [], snapshotAt: null });
    try {
      const page = await api.pendingReviews(instanceId, { signal: controller.signal });
      if (!controller.signal.aborted) setState({ phase: 'ready', ...page });
    } catch (error) {
      if (controller.signal.aborted) return;
      const denied = [401, 403].includes(error.status);
      setState({ phase: denied ? 'denied' : 'error', items: [], snapshotAt: null,
        error: denied ? 'Review access could not be verified. Confirm an authorized reviewer or administrator identity.'
          : [404, 503].includes(error.status) ? 'The review queue is unavailable. Try refreshing when the service is available.'
            : 'The review queue could not be verified. Refresh to try again. If the server restarted, confirm your identity again.' });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [api, allowed, instanceId]);

  useEffect(() => {
    loadQueue();
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [loadQueue]);

  if (!api || !identity) return <section className="view-placeholder" aria-labelledby="reviews-signin-title">
    <p className="eyebrow">Human review queue</p>
    <h2 id="reviews-signin-title">Confirm your reviewer identity.</h2>
    <p>Use the token form above with a reviewer or administrator account to view pending workflows.</p>
  </section>;

  if (!allowed) return <section className="view-placeholder" aria-labelledby="reviews-access-title">
    <p className="eyebrow">Restricted workspace</p>
    <h2 id="reviews-access-title">Reviewer access required.</h2>
    <p>The human review queue is available to reviewers and administrators. Customer accounts cannot access this queue.</p>
  </section>;

  const loading = state.phase === 'loading';
  return <section className="case-panel review-queue" aria-labelledby="review-queue-title">
    <div className="case-panel-heading">
      <div><p className="eyebrow">Human review</p><h2 id="review-queue-title">Pending review queue</h2></div>
      <button type="button" className="button-secondary" onClick={loadQueue}
        disabled={loading || state.phase === 'denied'} aria-busy={loading} aria-describedby="review-queue-status">
        {loading ? 'Loading reviews...' : 'Refresh reviews'}
      </button>
    </div>
    <p className="run-notice">Read-only workspace. These are proposals awaiting human review, not executed actions.
      Review or approval does not execute a business action.</p>
    <p id="review-queue-status" className="case-caption" role="status" aria-atomic="true">
      {loading ? 'Checking the backend for workflows awaiting human review...'
        : state.phase === 'ready' ? `${state.items.length} ${state.items.length === 1 ? 'workflow' : 'workflows'} awaiting review at the last refresh.`
          : 'Pending reviews could not be loaded. No queue data is shown.'}
    </p>
    {state.error && <p className="run-error" role="alert">{state.error}</p>}
    {state.snapshotAt && <p className="case-caption">Queue checked at (server): <time dateTime={state.snapshotAt}>{state.snapshotAt}</time>.
      {' '}Refresh to check for changes.</p>}
    {state.phase === 'ready' && state.items.length === 0 && <div className="case-empty">
      <h3>No workflows awaiting review</h3>
      <p>No review-required workflows with pending proposals were returned by this server. Refresh after a workflow requests review.</p>
    </div>}
    {state.items.length > 0 && <ol className="review-queue-list" aria-label="Workflows awaiting human review">
      {state.items.map((item) => <li key={item.runId} className="resolution-card">
        <div className="case-panel-heading">
          <h3>{item.caseSubject}</h3><span className="case-status">Waiting for human review</span>
        </div>
        <h4>Proposed action</h4>
        <p className="proposal-action">{item.action}</p>
        <h4>Proposal rationale</h4>
        <p className="run-message">{item.rationale}</p>
        <p className="case-caption">Proposal content is untrusted and requires independent human assessment.</p>
        <dl className="case-facts run-identifiers">
          <div><dt>Case ID</dt><dd>{item.caseId}</dd></div>
          <div><dt>Run ID</dt><dd>{item.runId}</dd></div>
          <div><dt>Workflow ID</dt><dd>{item.workflowId}</dd></div>
          <div><dt>Proposal ID</dt><dd>{item.proposalId}</dd></div>
          <div><dt>Review ID</dt><dd>{item.reviewId}</dd></div>
          <div><dt>Run status at refresh</dt><dd>{item.status}</dd></div>
          <div><dt>Review status at refresh</dt><dd>{item.reviewStatus}</dd></div>
          <div><dt>Run updated at (server)</dt><dd><time dateTime={item.updatedAt}>{item.updatedAt}</time></dd></div>
        </dl>
      </li>)}
    </ol>}
    <p className="run-footnote">This queue covers runs retained in the current server process. Server restarts clear these runs.
      Decisions cannot be submitted from this workspace.</p>
  </section>;
}

