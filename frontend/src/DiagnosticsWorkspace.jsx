import { useCallback, useState } from 'react';
import { operationLabels } from './diagnosticsContracts.js';
import useMetadataRead from './useMetadataRead.js';

const number = (value) => value.toLocaleString();
const milliseconds = (value) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`;
function failure(error) {
  if ([401, 403].includes(error.status)) return 'Diagnostics access was denied. Confirm an authorized reviewer or administrator identity.';
  if ([404, 503].includes(error.status)) return 'Diagnostics is unavailable. Check the local API, then refresh.';
  if (error.code === 'INVALID_DIAGNOSTICS_RESPONSE') return 'The diagnostics response could not be verified. No metadata was displayed. Refresh to try again.';
  return 'Diagnostics could not be loaded. Check the local API, then refresh.';
}
function Fact({ label, children }) { return <div><dt>{label}</dt><dd>{children}</dd></div>; }

// Presentational component takes only the validated diagnostics projection.
export function DiagnosticsSnapshot({ snapshot }) {
  return <>
    <p className="case-caption" role="status">Snapshot <time dateTime={snapshot.snapshot_at}>{new Date(snapshot.snapshot_at).toLocaleString()}</time>. Refresh for the latest records; times use your local time zone.</p>
    <dl className="diagnostics-summary">
      <Fact label="Recent events shown">{number(snapshot.events.length)}</Fact>
      <Fact label="Older retained events omitted">{number(snapshot.omitted_events)}</Fact>
      <Fact label="Events evicted from memory">{number(snapshot.evicted_events)}</Fact>
      <Fact label="Logging failures">{number(snapshot.logging_failures)}</Fact>
    </dl>
    <section aria-labelledby="diagnostics-metrics-title">
      <h3 id="diagnostics-metrics-title">Operation metrics</h3>
      <p className="case-caption">Cumulative in this server process, including events no longer retained. Operations can overlap; these are not independent request totals.</p>
      {snapshot.metrics.length === 0 ? <p className="run-notice">No operation metrics have been recorded.</p>
        : <ul className="diagnostics-metrics" aria-label="Operation metrics">
          {snapshot.metrics.map((metric) => <li key={metric.operation} className="resolution-card">
            <h4>{operationLabels[metric.operation]}</h4>
            <dl className="audit-event-facts">
              <Fact label="Recorded operations">{number(metric.count)}</Fact>
              <Fact label="Recorded errors">{number(metric.errors)}</Fact>
              <Fact label="Total duration">{milliseconds(metric.duration_ms_total)}</Fact>
              <Fact label="Maximum duration">{milliseconds(metric.duration_ms_max)}</Fact>
              <Fact label="Recorded provider calls">{number(metric.provider_calls)}</Fact>
            </dl>
            {metric.provider_calls > 0 && <div className="diagnostics-usage">
              <h5>Model token usage</h5>
              <p className="case-caption">Known counts are subtotals. Calls with unknown usage are not counted as zero.</p>
              <dl className="audit-event-facts">
                {['input', 'output', 'total'].map((part) => <Fact key={part} label={`${part[0].toUpperCase()}${part.slice(1)} tokens`}>
                  {number(metric[`${part}_tokens_known`])} known · {number(metric[`${part}_tokens_unknown_calls`])} calls unknown
                </Fact>)}
              </dl>
            </div>}
          </li>)}
        </ul>}
    </section>
    <section className="run-event-section" aria-labelledby="diagnostics-events-title">
      <h3 id="diagnostics-events-title">Recent operational events</h3>
      <p className="case-caption">Up to 50 recent records in backend recording order. Trace IDs correlate available records; omitted or evicted spans may leave gaps.</p>
      {snapshot.events.length === 0 ? <p className="run-notice">No recent operational events are available.</p>
        : <ol className="diagnostics-events" aria-label="Recent operational events" tabIndex={0}>
          {snapshot.events.map((event, index) => <li key={`${event.span_id}-${index}`} className="resolution-card">
            <div className="audit-event-heading"><h4>{operationLabels[event.operation]}</h4>
              <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time></div>
            <dl className="audit-event-facts">
              <Fact label="Duration">{milliseconds(event.duration_ms)}</Fact>
              <Fact label="Error code">{event.error ?? 'No error recorded'}</Fact>
              {event.tool !== null && <Fact label="Tool">{event.tool}</Fact>}
              {event.status !== null && <Fact label="Recorded status">{event.status}</Fact>}
              {event.method !== null && <Fact label="HTTP method">{event.method}</Fact>}
              {event.status_code !== null && <Fact label="HTTP status">{event.status_code}</Fact>}
              {event.provider !== null && <Fact label="Provider category">{event.provider}</Fact>}
              {event.provider_called !== null && <Fact label="Provider call recorded">{event.provider_called ? 'Yes' : 'No'}</Fact>}
              {event.provider_status_code !== null && <Fact label="Provider HTTP status">{event.provider_status_code}</Fact>}
              {event.invalid_response_stage !== null && <Fact label="Invalid response stage">{event.invalid_response_stage}</Fact>}
              {event.reviewer_authenticated !== null && <Fact label="Reviewer authenticated at event">{event.reviewer_authenticated ? 'Yes' : 'No'}</Fact>}
            </dl>
            {(event.operation === 'llm' || event.provider_called === true || event.input_tokens !== null
              || event.output_tokens !== null || event.total_tokens !== null || event.output_token_limit !== null) && <dl className="audit-event-facts">
              <Fact label="Input tokens">{event.input_tokens === null ? 'Unknown' : number(event.input_tokens)}</Fact>
              <Fact label="Output tokens">{event.output_tokens === null ? 'Unknown' : number(event.output_tokens)}</Fact>
              <Fact label="Total tokens">{event.total_tokens === null ? 'Unknown' : number(event.total_tokens)}</Fact>
              {event.output_token_limit !== null && <Fact label="Output token limit">{number(event.output_token_limit)}</Fact>}
            </dl>}
            <details className="diagnostics-trace"><summary>Trace and context identifiers</summary>
              <dl className="audit-event-facts">
                <Fact label="Trace ID"><code>{event.trace_id}</code></Fact>
                <Fact label="Span ID"><code>{event.span_id}</code></Fact>
                {event.parent_span_id !== null && <Fact label="Parent span ID"><code>{event.parent_span_id}</code></Fact>}
                {event.case_id !== null && <Fact label="Case ID"><code>{event.case_id}</code></Fact>}
                {event.workflow_id !== null && <Fact label="Workflow ID"><code>{event.workflow_id}</code></Fact>}
                {event.proposal_id !== null && <Fact label="Proposal ID"><code>{event.proposal_id}</code></Fact>}
                {event.reviewer_user_id !== null && <Fact label="Reviewer user ID"><code>{event.reviewer_user_id}</code></Fact>}
              </dl>
            </details>
          </li>)}
        </ol>}
    </section>
  </>;
}

function DiagnosticsRead({ api, onDenied }) {
  const load = useCallback((signal) => api.diagnostics({ signal }), [api]);
  const state = useMetadataRead(load, onDenied, failure);
  return <section className="case-panel" aria-labelledby="diagnostics-title" aria-busy={state.phase === 'loading'}>
    <div className="case-panel-heading"><h2 id="diagnostics-title">Operational snapshot</h2>
      <button className="button-secondary" onClick={state.refresh} disabled={state.phase === 'loading'}>Refresh diagnostics</button></div>
    {state.phase === 'loading' && <p role="status" className="case-caption">Loading diagnostics...</p>}
    {state.phase === 'error' && <p role="alert" className="run-error">{state.message}</p>}
    {state.data && <DiagnosticsSnapshot snapshot={state.data} />}
  </section>;
}

export default function DiagnosticsWorkspace({ api, identity }) {
  const [denied, setDenied] = useState(false);
  const allowed = api && identity && ['REVIEWER', 'ADMIN'].includes(identity.role);
  return <div className="diagnostics-workspace">
    <p className="run-notice">Read-only operational metadata for this server process. Records reset on restart. This snapshot is not a health assessment, an audit of business decisions, or authorization to execute actions.</p>
    {!api || !identity ? <p className="case-panel" role="status">Confirm your identity to open Diagnostics.</p>
      : !allowed || denied ? <p className="case-panel" role="alert">Diagnostics requires an authorized reviewer or administrator. Confirm an authorized identity to continue.</p>
        : <DiagnosticsRead api={api} onDenied={setDenied} />}
  </div>;
}
