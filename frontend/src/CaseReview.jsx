import { useEffect, useRef, useState } from 'react';
import { api as defaultApi } from './api.js';

const denialLabels = {
  item_not_in_order: 'The selected item is not in this order.',
  quantity_exceeds_purchased: 'Requested quantity exceeds the purchased quantity.',
  outside_return_window: 'The supplied delivery age is outside the policy return window.',
  reason_not_allowed: 'The policy does not allow this return reason.',
  change_of_mind_requires_unused: 'Change-of-mind returns require unused condition.',
};
const label = (value) => value.replaceAll('_', ' ');
const loadingMessages = {
  cases: 'Loading available support cases…',
  context: 'Loading case, customer, and order details…',
  item: 'Loading inventory and applicable policy…',
  assessment: 'Checking eligibility with the backend…',
};

function Detail({ title, children }) {
  return <div><dt>{title}</dt><dd>{children}</dd></div>;
}

function EmptyPanel({ title, children }) {
  return <div className="case-empty">
    <span className="case-empty-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M3 7V5h7l2 2h9v13H3zM8 12h8M8 16h5" />
      </svg>
    </span>
    <h3>{title}</h3>
    <p>{children}</p>
  </div>;
}

export default function CaseReview({ api = defaultApi }) {
  const [cases, setCases] = useState(null);
  const [selected, setSelected] = useState('');
  const [context, setContext] = useState(null);
  const [item, setItem] = useState(null);
  const [sku, setSku] = useState('');
  const [inputs, setInputs] = useState({ quantity: '1', days_since_delivery: '', reason: '', condition: '' });
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState(null);
  const requestVersion = useRef(0);
  const busy = pending !== null;
  const error = failure?.message || '';

  useEffect(() => () => { requestVersion.current += 1; }, [api]);

  async function run(stage, request, applyResult) {
    const version = ++requestVersion.current;
    setPending(stage);
    setFailure(null);
    try {
      const data = await request();
      if (version === requestVersion.current) applyResult(data);
    } catch (cause) {
      if (version === requestVersion.current) {
        setFailure({ stage, message: `${cause.message || 'Request failed'}. Check the local backend and retry.` });
      }
    } finally {
      if (version === requestVersion.current) setPending(null);
    }
  }

  function clearReview() {
    requestVersion.current += 1;
    setPending(null); setFailure(null);
    setContext(null); setItem(null); setSku(''); setResult(null);
    setInputs({ quantity: '1', days_since_delivery: '', reason: '', condition: '' });
  }

  function edit(name, value) {
    requestVersion.current += 1;
    setPending(null);
    setInputs((previous) => ({ ...previous, [name]: value }));
    setResult(null); setFailure(null);
  }

  function loadItem(nextSku) {
    setItem(null); setResult(null);
    run('item', () => api.item(nextSku), setItem);
  }

  return (
    <section className="review case-resolution" aria-labelledby="review-title" aria-busy={busy}>
      <div className="case-selector-panel">
        <div className="review-heading">
          <div>
            <p className="eyebrow">Case workspace</p>
            <h2 id="review-title" tabIndex={-1}>Review a support case</h2>
          </div>
          <div className="case-toolbar-actions">
            {cases !== null && <span className="case-count">{cases.length} {cases.length === 1 ? 'case' : 'cases'} loaded</span>}
            <button className="button-secondary" disabled={busy} onClick={() => {
              clearReview(); setSelected(''); setCases(null);
              run('cases', () => api.listCases(), setCases);
            }}>Refresh cases</button>
          </div>
        </div>
        {!!cases?.length && <form className="case-selector-form" onSubmit={(event) => {
          event.preventDefault(); clearReview();
          run('context', () => api.context(selected), setContext);
        }}>
          <fieldset disabled={busy}>
            <label>Support case<select required value={selected} onChange={(event) => {
              setSelected(event.target.value); clearReview();
            }}><option value="">Choose a case</option>{cases.map((entry) =>
              <option key={entry.id} value={entry.id}>{entry.subject} — {entry.id}</option>,
            )}</select></label>
            <button type="submit">Load case</button>
          </fieldset>
        </form>}
        <p className="review-description">Read-only review. No case updates, stock reservations, refunds, or approvals are performed.</p>
      </div>

      {busy && <p className="case-notice" role="status">{loadingMessages[pending]}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!context && !busy && !error && <div className="case-panel case-start" role="status">
        {cases === null ? <EmptyPanel title="Start with a support case">
          Refresh cases to load the records available to your identity. Then choose a case to review its details.
        </EmptyPanel> : cases.length === 0 ? <EmptyPanel title="No cases available">
          No support cases were returned. Refresh when case records are available.
        </EmptyPanel> : <EmptyPanel title="Choose a case to begin">
          Select a support case above and load its customer, order, and item details.
        </EmptyPanel>}
      </div>}

      {context && <>
        <section className="case-panel case-summary" aria-labelledby="case-summary-title">
          <div className="case-panel-heading">
            <div>
              <p className="eyebrow">Case details</p>
              <h3 id="case-summary-title">{context.supportCase.subject}</h3>
            </div>
            <span className="case-status">{label(context.supportCase.status)}</span>
          </div>
          <p className="case-description">{context.supportCase.description}</p>
          <dl className="case-reference">
            <Detail title="Case ID">{context.supportCase.id}</Detail>
          </dl>
        </section>

        <div className="case-details-grid">
          <section className="case-panel" aria-labelledby="case-context-title">
            <div className="case-panel-heading">
              <div><p className="eyebrow">Customer & order</p><h3 id="case-context-title">Review context</h3></div>
            </div>
            <dl className="case-facts">
              <Detail title="Customer">{context.customer.name}</Detail>
              <Detail title="Customer ID">{context.customer.id}</Detail>
              <Detail title="Order ID">{context.order.id}</Detail>
            </dl>
            <div className="case-subsection">
              <h4>Ordered items</h4>
              <ul className="case-item-list">{context.order.items.map((entry, index) =>
                <li key={`${entry.sku}-${index}`}>
                  <div><strong>{entry.name}</strong><span className="case-item-sku">{entry.sku}</span></div>
                  <span className="case-item-quantity">Qty {entry.quantity}</span>
                </li>,
              )}</ul>
              <label className="case-item-select">Item to review<select disabled={busy} value={sku} onChange={(event) => {
                const next = event.target.value;
                requestVersion.current += 1;
                setPending(null); setFailure(null);
                setSku(next); setItem(null); setResult(null);
                setInputs({ quantity: '1', days_since_delivery: '', reason: '', condition: '' });
                if (next) loadItem(next);
              }}><option value="">Choose an item</option>{[...new Set(context.order.items.map((entry) => entry.sku))].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </div>
          </section>

          <section className="case-panel" aria-labelledby="case-policy-title">
            <div className="case-panel-heading">
              <div><p className="eyebrow">Policy reference</p><h3 id="case-policy-title">Inventory & applicable policy</h3></div>
            </div>
            {item ? <>
              <div className="case-stock">
                <strong>{item.inventory.available_quantity} units available</strong>
                <span>{item.inventory.sku}</span>
              </div>
              <p className="case-caption">Stock is informational for this return/refund assessment.</p>
              <dl className="case-facts">
                <Detail title="Policy">{item.policy.id} · {item.policy.version}</Detail>
                <Detail title="Return window">{item.policy.return_window_days} days (inclusive)</Detail>
                <Detail title="Allowed reasons">{item.policy.allowed_reasons.map(label).join(', ')}</Detail>
                <Detail title="Unused condition required for change of mind">{item.policy.change_of_mind_requires_unused ? 'Yes' : 'No'}</Detail>
                <Detail title="Verified return required for refund">{item.policy.refund_requires_return ? 'Yes' : 'No'}</Detail>
              </dl>
              <p className="case-caption case-policy-description">{item.policy.description}</p>
            </> : <EmptyPanel title={pending === 'item' ? 'Loading item details' : failure?.stage === 'item' ? 'Item details unavailable' : 'Select an item'}>
              {pending === 'item' ? 'Waiting for inventory and policy from the backend.' : failure?.stage === 'item' ? 'Check the error above before retrying.' : 'Choose an ordered item to view its inventory and applicable policy.'}
            </EmptyPanel>}
            {failure?.stage === 'item' && sku && <button type="button" className="button-secondary" disabled={busy}
              onClick={() => loadItem(sku)}>Retry item details</button>}
          </section>
        </div>

        {item && <div className="case-assessment-grid">
          <form className="case-panel" aria-labelledby="assessment-inputs-title" onSubmit={(event) => {
            event.preventDefault(); setResult(null);
            run('assessment', () => api.eligibility(context.order.id, {
              customer_id: context.customer.id, sku, ...inputs,
            }), setResult);
          }}>
            <div className="case-panel-heading">
              <div><p className="eyebrow">Assessment inputs</p><h3 id="assessment-inputs-title">Assessment assumptions</h3></div>
            </div>
            <p className="case-caption">Enter scenario inputs. Delivery age, reason, and condition have not been verified against evidence or payment history.</p>
            <fieldset disabled={busy}>
              <div className="input-grid">
                <label>Requested quantity<input type="number" min="1" max="1000" step="1" required value={inputs.quantity} onChange={(event) => edit('quantity', event.target.value)} /></label>
                <label>Days since delivery<input type="number" min="0" max="36500" step="1" required value={inputs.days_since_delivery} onChange={(event) => edit('days_since_delivery', event.target.value)} /></label>
                <label>Return reason<select required value={inputs.reason} onChange={(event) => edit('reason', event.target.value)}><option value="">Choose a reason</option>{item.policy.allowed_reasons.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                <label>Item condition<select required value={inputs.condition} onChange={(event) => edit('condition', event.target.value)}><option value="">Choose a condition</option>{['unused', 'used', 'damaged'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              </div>
              <div className="case-form-footer"><button type="submit">Check eligibility</button><span>Assessment only · no action execution</span></div>
            </fieldset>
          </form>

          <section className={`case-panel${result ? ' assessment' : ''}`} aria-labelledby="assessment-result-title">
            <div className="case-panel-heading">
              <div><p className="eyebrow">Backend assessment</p><h3 id="assessment-result-title">Eligibility result</h3></div>
            </div>
            {result ? <div role="status">
              <div className="eligibility-outcomes">
                <div><span>Return</span><strong className={result.return_eligible ? 'eligible' : 'ineligible'}>{result.return_eligible ? 'Conditionally eligible' : 'Ineligible'}</strong></div>
                <div><span>Refund</span><strong className={result.refund_eligible ? 'eligible' : 'ineligible'}>{result.refund_eligible ? 'Conditionally eligible' : 'Ineligible'}</strong></div>
              </div>
              <p className="case-caption">No action is authorized or executed. This is a local demonstration assessment, not verified entitlement.</p>
              {result.denial_reasons.length > 0 && <div className="case-denials"><h4>Denial reasons</h4><ul>{result.denial_reasons.map((reason) => <li key={reason}>{denialLabels[reason] || label(reason)} <code>({reason})</code></li>)}</ul></div>}
              <h4>Inputs evaluated by the API</h4>
              <dl className="case-facts">
                <Detail title="Order / customer">{result.order_id} / {result.customer_id}</Detail>
                <Detail title="SKU">{result.sku}</Detail>
                <Detail title="Requested / purchased quantity">{result.requested_quantity} / {result.purchased_quantity}</Detail>
                <Detail title="Days since delivery">{result.days_since_delivery}</Detail>
                <Detail title="Reason / condition">{label(result.reason)} / {label(result.condition)}</Detail>
                <Detail title="Policy version">{result.policy_id} · {result.policy_version}</Detail>
                <Detail title="Assessment basis">{label(result.assessment_basis)}</Detail>
                <Detail title="Refund requires verified return">{result.refund_requires_return ? 'Yes' : 'No'}</Detail>
                <Detail title="Authorization granted">{result.authorization_granted ? 'Yes' : 'No'}</Detail>
              </dl>
            </div> : <EmptyPanel title={pending === 'assessment' ? 'Assessment in progress' : failure?.stage === 'assessment' ? 'Assessment unavailable' : 'No assessment yet'}>
              {pending === 'assessment' ? 'Waiting for the backend eligibility result.' : failure?.stage === 'assessment' ? 'Check the error above before retrying.' : 'Enter the scenario inputs and check eligibility to see the backend result here.'}
            </EmptyPanel>}
          </section>
        </div>}
      </>}
    </section>
  );
}
