// Every UI operation is a GET. Policy decisions remain in the backend.
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
      const policy = await get(`/policies/${encodeURIComponent(inventory.policy_id)}`);
      return { inventory, policy };
    },
    eligibility: (orderId, inputs) => get(
      `/orders/${encodeURIComponent(orderId)}/eligibility?${new URLSearchParams(inputs)}`,
    ),
  };
}

export const api = createApi();
