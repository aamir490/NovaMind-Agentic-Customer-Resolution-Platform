import { useState } from 'react';
import { api } from './api.js';

const denialLabels = {
  item_not_in_order: 'The selected item is not in this order.',
  quantity_exceeds_purchased: 'Requested quantity exceeds the purchased quantity.',
  outside_return_window: 'The supplied delivery age is outside the policy return window.',
  reason_not_allowed: 'The policy does not allow this return reason.',
  change_of_mind_requires_unused: 'Change-of-mind returns require unused condition.',
};
const label = (value) => value.replaceAll('_', ' ');

export default function CaseReview() {
  const [cases, setCases] = useState(null);
  const [selected, setSelected] = useState('');
  const [context, setContext] = useState(null);
  const [item, setItem] = useState(null);
  const [sku, setSku] = useState('');
  const [inputs, setInputs] = useState({ quantity: '1', days_since_delivery: '', reason: '', condition: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(action) {
    setBusy(true);
    setError('');
    try { await action(); }
    catch (failure) { setError(`${failure.message || 'Request failed'}. Check the local backend and retry.`); }
    finally { setBusy(false); }
  }

  function clearReview() {
    setContext(null); setItem(null); setSku(''); setResult(null);
    setInputs({ quantity: '1', days_since_delivery: '', reason: '', condition: '' });
  }

  function edit(name, value) {
    setInputs((previous) => ({ ...previous, [name]: value }));
    setResult(null); setError('');
  }

  return (
    <section className="review" aria-labelledby="review-title" aria-busy={busy}>
      <h2 id="review-title">Review a local support case</h2>
      <p>Read-only review. No case updates, stock reservations, refunds, or approvals are performed.</p>
      <button disabled={busy} onClick={() => {
        clearReview(); setSelected(''); setCases(null);
        run(async () => setCases(await api.listCases()));
      }}>Refresh cases</button>
      {cases?.length === 0 && <p role="status">No cases found. Create synthetic records using the Phase 1 API walkthrough, then refresh. Restarting the backend clears its data.</p>}
      {!!cases?.length && <form onSubmit={(event) => {
        event.preventDefault(); clearReview();
        run(async () => setContext(await api.context(selected)));
      }}>
        <fieldset disabled={busy}>
          <label>Support case<select required value={selected} onChange={(event) => {
            setSelected(event.target.value); clearReview(); setError('');
          }}><option value="">Choose a case</option>{cases.map((entry) =>
            <option key={entry.id} value={entry.id}>{entry.subject} — {entry.id}</option>,
          )}</select></label>
          <button type="submit">Load case</button>
        </fieldset>
      </form>}

      {context && <>
        <div className="card">
          <h3>{context.supportCase.subject}</h3>
          <p>{context.supportCase.description}</p>
          <dl>
            <dt>Case ID</dt><dd>{context.supportCase.id}</dd>
            <dt>Case status</dt><dd>{label(context.supportCase.status)}</dd>
            <dt>Customer</dt><dd>{context.customer.name} · {context.customer.id}</dd>
            <dt>Order ID</dt><dd>{context.order.id}</dd>
          </dl>
          <h3>Ordered items</h3>
          <ul>{context.order.items.map((entry, index) => <li key={`${entry.sku}-${index}`}>{entry.name} · {entry.sku} · Quantity {entry.quantity}</li>)}</ul>
          <label>Item to review<select disabled={busy} value={sku} onChange={(event) => {
            const next = event.target.value;
            setSku(next); setItem(null); setResult(null); setError('');
            setInputs({ quantity: '1', days_since_delivery: '', reason: '', condition: '' });
            if (next) run(async () => setItem(await api.item(next)));
          }}><option value="">Choose an item</option>{[...new Set(context.order.items.map((entry) => entry.sku))].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        {item && <>
          <div className="card">
            <h3>Inventory and applicable policy</h3>
            <p><strong>{item.inventory.available_quantity} units available</strong> for {item.inventory.sku}. Stock is informational for this return/refund assessment.</p>
            <dl>
              <dt>Policy</dt><dd>{item.policy.id} · {item.policy.version}</dd>
              <dt>Return window</dt><dd>{item.policy.return_window_days} days (inclusive)</dd>
              <dt>Allowed reasons</dt><dd>{item.policy.allowed_reasons.map(label).join(', ')}</dd>
              <dt>Unused condition required for change of mind</dt><dd>{item.policy.change_of_mind_requires_unused ? 'Yes' : 'No'}</dd>
              <dt>Verified return required for refund</dt><dd>{item.policy.refund_requires_return ? 'Yes' : 'No'}</dd>
            </dl>
            <p>{item.policy.description}</p>
          </div>
          <form className="card" onSubmit={(event) => {
            event.preventDefault(); setResult(null);
            run(async () => setResult(await api.eligibility(context.order.id, {
              customer_id: context.customer.id, sku, ...inputs,
            })));
          }}>
            <h3>Assessment assumptions</h3>
            <p>Enter scenario inputs. Delivery age, reason, and condition have not been verified against evidence or payment history.</p>
            <fieldset disabled={busy}>
              <div className="input-grid">
                <label>Requested quantity<input type="number" min="1" max="1000" step="1" required value={inputs.quantity} onChange={(event) => edit('quantity', event.target.value)} /></label>
                <label>Days since delivery<input type="number" min="0" max="36500" step="1" required value={inputs.days_since_delivery} onChange={(event) => edit('days_since_delivery', event.target.value)} /></label>
                <label>Return reason<select required value={inputs.reason} onChange={(event) => edit('reason', event.target.value)}><option value="">Choose a reason</option>{item.policy.allowed_reasons.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                <label>Item condition<select required value={inputs.condition} onChange={(event) => edit('condition', event.target.value)}><option value="">Choose a condition</option>{['unused', 'used', 'damaged'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              </div>
              <button type="submit">Check eligibility</button>
            </fieldset>
          </form>
        </>}
      </>}
      {busy && <p role="status">Loading local API data…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {result && <div className="card assessment" role="status">
        <h3>Eligibility result</h3>
        <p><strong>Return: {result.return_eligible ? 'Conditionally eligible' : 'Ineligible'}</strong></p>
        <p><strong>Refund: {result.refund_eligible ? 'Conditionally eligible' : 'Ineligible'}</strong></p>
        <p>No action is authorized or executed. This is a local demonstration assessment, not verified entitlement.</p>
        {result.denial_reasons.length > 0 && <><h4>Denial reasons</h4><ul>{result.denial_reasons.map((reason) => <li key={reason}>{denialLabels[reason] || label(reason)} <code>({reason})</code></li>)}</ul></>}
        <h4>Inputs evaluated by the API</h4>
        <dl>
          <dt>Order / customer</dt><dd>{result.order_id} / {result.customer_id}</dd>
          <dt>SKU</dt><dd>{result.sku}</dd>
          <dt>Requested / purchased quantity</dt><dd>{result.requested_quantity} / {result.purchased_quantity}</dd>
          <dt>Days since delivery</dt><dd>{result.days_since_delivery}</dd>
          <dt>Reason / condition</dt><dd>{label(result.reason)} / {label(result.condition)}</dd>
          <dt>Policy version</dt><dd>{result.policy_id} · {result.policy_version}</dd>
          <dt>Assessment basis</dt><dd>{label(result.assessment_basis)}</dd>
          <dt>Refund requires verified return</dt><dd>{result.refund_requires_return ? 'Yes' : 'No'}</dd>
          <dt>Authorization granted</dt><dd>{result.authorization_granted ? 'Yes' : 'No'}</dd>
        </dl>
      </div>}
    </section>
  );
}
