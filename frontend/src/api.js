// Every UI operation is a GET. Policy decisions remain in the backend.
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const isTextList = (value) => Array.isArray(value) && value.every(isText);

function requireResponse(valid, resource) {
  if (!valid) throw new Error(`The API returned an invalid ${resource} response. No result was loaded`);
}

export function createApi(fetcher = globalThis.fetch, { token = '', onUnauthorized } = {}) {
  // One in-memory client per identity. Never persist credentials or put them in URLs.
  const lifetime = new AbortController();

  async function get(path) {
    if (lifetime.signal.aborted) throw new Error('This browser session has ended.');
    const response = await fetcher(`/api${path}`, {
      method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.any([AbortSignal.timeout(5000), lifetime.signal]),
    });
    if (!response.ok) {
      let detail;
      try { detail = (await response.json()).detail; } catch { /* Use status fallback. */ }
      const message = Array.isArray(detail) ? detail.map((item) => item.msg).join('; ') : detail;
      const error = new Error(typeof message === 'string' ? message : `API request failed (${response.status})`);
      error.status = response.status;
      if (response.status === 401) onUnauthorized?.();
      throw error;
    }
    return response.json();
  }
  return {
    dispose() {
      token = '';
      lifetime.abort();
    },
    async identity() {
      const payload = await get('/identity');
      const identity = payload?.identity;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!identity || typeof identity.user_id !== 'string' || !uuid.test(identity.user_id)
          || !['CUSTOMER', 'REVIEWER', 'ADMIN'].includes(identity.role)
          || (identity.role === 'CUSTOMER'
            ? typeof identity.customer_id !== 'string' || !uuid.test(identity.customer_id)
            : identity.customer_id !== null)) {
        throw new Error('Unexpected identity response.');
      }
      // Display only identity fields confirmed by the backend, never token contents.
      return { user_id: identity.user_id, role: identity.role, customer_id: identity.customer_id };
    },
    listCases: () => get('/cases'),
    async context(id) {
      const supportCase = await get(`/cases/${encodeURIComponent(id)}`);
      const [customer, order] = await Promise.all([
        get(`/customers/${encodeURIComponent(supportCase.customer_id)}`),
        get(`/orders/${encodeURIComponent(supportCase.order_id)}`),
      ]);
      return { supportCase, customer, order };
    },
    async item(sku) {
      const inventory = await get(`/inventory/${encodeURIComponent(sku)}`);
      requireResponse(inventory?.sku === sku && isCount(inventory.available_quantity)
        && isText(inventory.policy_id), 'inventory');
      const policy = await get(`/policies/${encodeURIComponent(inventory.policy_id)}`);
      requireResponse(policy?.id === inventory.policy_id && isText(policy.version)
        && isCount(policy.return_window_days) && isTextList(policy.allowed_reasons)
        && typeof policy.change_of_mind_requires_unused === 'boolean'
        && typeof policy.refund_requires_return === 'boolean'
        && typeof policy.description === 'string', 'policy');
      return { inventory, policy };
    },
    async eligibility(orderId, inputs) {
      const submitted = { ...inputs };
      const result = await get(
        `/orders/${encodeURIComponent(orderId)}/eligibility?${new URLSearchParams(submitted)}`,
      );
      // Check the returned contract and request binding, never recompute eligibility.
      // Missing booleans must not render as invented denials or authorization.
      requireResponse(result?.order_id === orderId && result.customer_id === submitted.customer_id
        && result.sku === submitted.sku && result.reason === submitted.reason
        && result.condition === submitted.condition
        && isCount(result.requested_quantity) && result.requested_quantity === Number(submitted.quantity)
        && isCount(result.days_since_delivery) && result.days_since_delivery === Number(submitted.days_since_delivery)
        && isCount(result.purchased_quantity) && isText(result.policy_id) && isText(result.policy_version)
        && typeof result.return_eligible === 'boolean' && typeof result.refund_eligible === 'boolean'
        && typeof result.refund_requires_return === 'boolean' && isTextList(result.denial_reasons)
        && result.assessment_basis === 'local_scenario_unverified_inputs'
        && result.authorization_granted === false, 'eligibility');
      return result;
    },
  };
}

export const api = createApi();
