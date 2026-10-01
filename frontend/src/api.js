// Every UI operation is a GET. Policy decisions remain in the backend.
export function createApi(fetcher = globalThis.fetch) {
  async function get(path) {
    const response = await fetcher(`/api${path}`, {
      method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      let detail;
      try { detail = (await response.json()).detail; } catch { /* Use status fallback. */ }
      const message = Array.isArray(detail) ? detail.map((item) => item.msg).join('; ') : detail;
      throw new Error(typeof message === 'string' ? message : `API request failed (${response.status})`);
    }
    return response.json();
  }
  return {
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
