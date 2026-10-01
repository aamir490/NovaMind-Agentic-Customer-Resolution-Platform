# Frontend

The accepted Phase 0B React/Vite foundation now includes the Phase 3 read-only local case-review screen and the existing API health check. It fetches case/customer/order context, inventory, policy, and conditional eligibility using GET only. Business rules remain in the backend. See [the UI walkthrough](../docs/phase-3-case-review.md).

Use Node.js 24 and the existing `package-lock.json`. The initial commit has not been created. Phase 0C uses the installed dependencies without `npm ci` or other installation commands. See [local development](../docs/local-development.md) for the two-terminal workflow and separately labelled setup instructions.

During development, Vite forwards `/api` requests to `http://127.0.0.1:8000`. This keeps browser requests on one origin without introducing a permissive CORS policy. Production API routing is a future deployment decision. `npm run preview` previews static assets only and does not provide the development API proxy.
