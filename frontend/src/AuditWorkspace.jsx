import { useCallback, useEffect, useState } from 'react';

import AuditTimeline from './AuditTimeline.jsx';

const date = (value) => new Date(value).toLocaleString();

function failure(error) {
  if ([401, 403].includes(error.status)) return 'Audit access was denied. Confirm an authorized reviewer or administrator identity.';
  if (error.code === 'AUDIT_PENDING_USE_EVENTS') return 'Audit metadata is pending while this run executes or resumes. Refresh after it pauses or finishes.';
  if (error.status === 404) return 'This resource is no longer available. Runs are held in memory and may be lost after a server restart. Refresh the case list and confirm your identity again.';
  if (error.code === 'INVALID_AUDIT_RESPONSE' || [409, 422].includes(error.status)) return 'The selection or audit response could not be verified. Refresh the case list. If the server restarted, confirm your identity again.';
  if (error.status === 503) return 'Audit data or the service is unavailable. Refresh when the service is available.';
  return 'Audit data could not be loaded or verified. Check the local API and refresh to try again.';
}

// Each selection owns a cancellable request. Keyed children drop old results on
// case/run/page changes; unmounting or signing out aborts in-flight reads.
function useAuditRead(load, onDenied) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ phase: 'loading', data: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ phase: 'loading', data: null });
    load(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ phase: 'ready', data });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if ([401, 403].includes(error.status)) onDenied(true);
      setState({ phase: 'error', data: null, message: failure(error) });
    });
    return () => controller.abort();
  }, [load, onDenied, revision]);
  return { ...state, refresh() {
    setState({ phase: 'loading', data: null });
    setRevision((value) => value + 1);
  } };
}

function ReadStatus({ state, loading }) {
  return <>
    {state.phase === 'loading' && <p className="case-caption" role="status">{loading}</p>}
    {state.phase === 'error' && <p className="run-error" role="alert">{state.message}</p>}
  </>;
}

function AuditEvents({ api, binding, onDenied }) {
  const [cursors, setCursors] = useState([0]);
  const after = cursors.at(-1);
  return <AuditEventPage key={after} api={api} binding={binding} onDenied={onDenied} after={after}
    previous={cursors.length > 1 ? () => setCursors((values) => values.slice(0, -1)) : null}
    next={(cursor) => setCursors((values) => [...values, cursor])} />;
}

function AuditEventPage({ api, binding, onDenied, after, previous, next }) {
  const load = useCallback((signal) => api.runAudit(binding, after, { signal }), [api, binding, after]);
  const state = useAuditRead(load, onDenied);
  return <section className="case-panel" aria-labelledby="audit-events-title" aria-busy={state.phase === 'loading'}>
    <div className="case-panel-heading">
      <div><p className="eyebrow">Workflow history</p><h3 id="audit-events-title">Run audit timeline</h3></div>
      <button className="button-secondary" onClick={state.refresh} disabled={state.phase === 'loading'}>Refresh audit page</button>
    </div>
    <p className="case-caption">Run <code>{binding.run_id}</code></p>
    <ReadStatus state={state} loading="Loading audit timeline..." />
    {state.data && <>
      <AuditTimeline events={state.data.events} after={after} hasMore={state.data.has_more} />
      <p className="case-caption" role="status">{state.data.events.length} {state.data.events.length === 1 ? 'record' : 'records'} on this page. {state.data.has_more ? 'More records are available.' : 'End of the available audit history.'}</p>
    </>}
    <div className="audit-pagination">
      {previous && <button className="button-secondary" onClick={previous}>Previous audit page</button>}
      {state.data?.has_more && <button className="button-secondary" onClick={() => next(state.data.next_after)}>Next audit page</button>}
    </div>
  </section>;
}

function RunPage({ api, instanceId, caseId, offset, onDenied, previous, next }) {
  const load = useCallback((signal) => api.auditRuns({ instance_id: instanceId, case_id: caseId }, offset, { signal }),
    [api, instanceId, caseId, offset]);
  const state = useAuditRead(load, onDenied);
  const [selected, setSelected] = useState(null);
  function refresh() { setSelected(null); state.refresh(); }
  return <>
    <section className="case-panel" aria-labelledby="audit-runs-title" aria-busy={state.phase === 'loading'}>
      <div className="case-panel-heading"><div><p className="eyebrow">Select a run</p><h3 id="audit-runs-title">Case runs</h3></div>
        <button className="button-secondary" onClick={refresh} disabled={state.phase === 'loading'}>Refresh run page</button></div>
      <ReadStatus state={state} loading="Loading case runs..." />
      {state.data && <>
        {state.data.items.length === 0 ? <p className="run-notice" role="status">No runs are available on this page for this case in the current server process.</p>
          : <label htmlFor="audit-run">Run
            <select id="audit-run" value={selected?.run_id ?? ''} onChange={(event) => {
              const run = state.data.items.find((item) => item.run_id === event.target.value);
              setSelected(run ? { ...run, case_id: caseId, instance_id: instanceId } : null);
            }}>
              <option value="">Select a run...</option>
              {state.data.items.map((run) => <option key={run.run_id} value={run.run_id}>
                {run.status} · {date(run.created_at)} · {run.run_id}
              </option>)}
            </select>
          </label>}
        <p className="case-caption">Showing {state.data.items.length} runs from position {offset + 1}. Run statuses reflect the last run-list refresh.</p>
      </>}
      <div className="audit-pagination">
        {previous && <button className="button-secondary" onClick={previous}>Previous run page</button>}
        {state.data?.next_offset !== null && state.data?.next_offset !== undefined
          && <button className="button-secondary" onClick={() => next(state.data.next_offset)}>Next run page</button>}
      </div>
      {selected && <dl className="case-facts audit-run-facts">
        <div><dt>Last loaded run status</dt><dd>{selected.status}</dd></div>
        <div><dt>Workflow ID</dt><dd>{selected.workflow_id ?? 'Not available'}</dd></div>
        <div><dt>Run last updated</dt><dd>{date(selected.updated_at)}</dd></div>
      </dl>}
    </section>
    {selected && <AuditEvents key={selected.run_id} api={api} binding={selected} onDenied={onDenied} />}
  </>;
}

function CaseRuns({ api, instanceId, caseId, onDenied }) {
  const [offset, setOffset] = useState(0);
  return <RunPage key={offset} api={api} instanceId={instanceId} caseId={caseId} onDenied={onDenied} offset={offset}
    previous={offset > 0 ? () => setOffset((value) => value - 50) : null} next={setOffset} />;
}

function AuditCases({ api, identity, onDenied }) {
  const load = useCallback((signal) => api.auditCases({ signal }), [api]);
  const state = useAuditRead(load, onDenied);
  const [caseId, setCaseId] = useState('');
  return <>
    <section className="case-selector-panel" aria-labelledby="audit-cases-title" aria-busy={state.phase === 'loading'}>
      <div className="case-panel-heading"><div><p className="eyebrow">Select a case</p><h2 id="audit-cases-title">Available cases</h2></div>
        <button className="button-secondary" disabled={state.phase === 'loading'} onClick={() => { setCaseId(''); state.refresh(); }}>Refresh case list</button></div>
      <ReadStatus state={state} loading="Loading available cases..." />
      {state.data && (state.data.length === 0 ? <p className="run-notice" role="status">No cases are available to this identity.</p>
        : <label htmlFor="audit-case">Case ID
          <select id="audit-case" value={caseId} onChange={(event) => setCaseId(event.target.value)}>
            <option value="">Select a case...</option>
            {state.data.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
        </label>)}
      {state.data?.length > 0 && !caseId && <p className="case-caption">Select a case, then a run to view its audit metadata.</p>}
    </section>
    {caseId && <CaseRuns key={caseId} api={api} instanceId={identity.instance_id} caseId={caseId} onDenied={onDenied} />}
  </>;
}

export default function AuditWorkspace({ api, identity }) {
  const [denied, setDenied] = useState(false);
  const allowed = api && identity && ['REVIEWER', 'ADMIN'].includes(identity.role);
  return <div className="audit-workspace">
    <p className="run-notice">Read-only workflow audit metadata from the current server process. History is held in memory and is not a durable or complete compliance log. A recorded approval does not mean a business action was executed.</p>
    {!api || !identity ? <p className="case-panel" role="status">Confirm your identity to open Audit.</p>
      : !allowed || denied ? <p className="case-panel" role="alert">Audit requires an authorized reviewer or administrator. Confirm an authorized identity to continue.</p>
        : <AuditCases api={api} identity={identity} onDenied={setDenied} />}
  </div>;
}

