import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createApi } from '../frontend/src/api.js';

// Render the real JSX using the existing Vite/React dependencies; no test packages.
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let server, AuditTimeline, AuditWorkspace;
before(async () => {
  const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
  const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')).href);
  server = await createServer({ root: fileURLToPath(new URL('../frontend', import.meta.url)),
    configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  AuditTimeline = (await server.ssrLoadModule('/src/AuditTimeline.jsx')).default;
  AuditWorkspace = (await server.ssrLoadModule('/src/AuditWorkspace.jsx')).default;
});
after(async () => { await server?.close(); });

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const binding = { instance_id: id(1), case_id: id(2), run_id: id(3) };
const event = (sequence, changes = {}) => ({ sequence, timestamp: '2026-10-04T10:00:00Z',
  kind: 'AGENT', tool: null, error: null, proposal_id: null, proposal_status: null, reviewer_user_id: null, ...changes });
async function render(events, { after = 0, hasMore = false } = {}) {
  const api = createApi(async () => ({ ok: true, json: async () => ({ run_id: binding.run_id,
    scope: 'in_memory_workflow_audit', events, next_after: events.at(-1)?.sequence ?? after, has_more: hasMore }) }));
  const page = await api.runAudit(binding, after);
  return renderToStaticMarkup(createElement(AuditTimeline, { events: page.events, after, hasMore: page.has_more }));
}

test('timeline conveys recorded progression with timestamps, kinds and safe metadata', async () => {
  const html = await render([
    event(1, { tool: 'get_case' }),
    event(2, { kind: 'REVIEW_REQUIRED', proposal_id: id(4) }),
    event(3, { kind: 'HUMAN_REVIEW', proposal_id: id(4), proposal_status: 'APPROVED', reviewer_user_id: id(5) }),
    event(4, { kind: 'FAILURE', error: 'WORKFLOW_ERROR' }),
  ]);
  const headings = ['Tool activity recorded', 'Human review requested', 'Approval recorded', 'Workflow failure recorded'];
  assert.deepEqual([...html.matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map((match) => match[1]), headings);
  for (const text of ['AGENT', 'REVIEW_REQUIRED', 'HUMAN_REVIEW', 'FAILURE', 'get_case', 'APPROVED',
    id(4), id(5), 'WORKFLOW_ERROR', 'Events 1–4', 'does not confirm business action execution']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/<time dateTime="2026-10-04T10:00:00Z"/g) ?? []).length, 4);
  assert.match(html, /<ol[^>]*aria-label="Run audit timeline"[^>]*start="1"[^>]*tabindex="0"/);
  assert.doesNotMatch(html, /<button|<form/);
});

test('sequence remains authoritative when timestamps tie or the clock moves backwards', async () => {
  const html = await render([event(1), event(2), event(3, { timestamp: '2026-10-04T09:00:00Z' })]);
  assert.deepEqual([...html.matchAll(/<li value="(\d+)"/g)].map((match) => Number(match[1])), [1, 2, 3]);
  await assert.rejects(render([event(2), event(1)]), { code: 'INVALID_AUDIT_RESPONSE' });
  await assert.rejects(render([event(1), event(1)]), { code: 'INVALID_AUDIT_RESPONSE' });
});

test('optional metadata is omitted without inventing success or a review outcome', async () => {
  const html = await render([event(1), event(2, { kind: 'HUMAN_REVIEW' }),
    event(3, { kind: 'HUMAN_REVIEW', proposal_status: 'REJECTED' }), event(4, { error: 'TOOL_ERROR', tool: 'get_case' })]);
  for (const text of ['Agent activity recorded', 'Human review recorded', 'Rejection recorded', 'Agent error recorded', 'TOOL_ERROR']) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /Approval recorded|Reviewer user ID|Proposal ID|undefined|>null</);
  assert.match(html, /does not confirm tool success/);
  assert.match(html, /does not indicate that the run completed/);
});

test('page ranges and list numbering continue across cursor pages without implying completion', async () => {
  const first = await render(Array.from({ length: 50 }, (_, i) => event(i + 1)), { hasMore: true });
  assert.match(first, /Events 1–50/);
  assert.match(first, /timeline continues on the next page/);
  assert.doesNotMatch(first, /Continued from the previous page/);
  const last = await render([event(51, { kind: 'REVIEW_REQUIRED' })], { after: 50 });
  assert.match(last, /Events 51–51/);
  assert.match(last, /start="51"/);
  assert.match(last, /Continued from the previous page/);
  assert.match(last, /does not indicate that the run completed/);
  assert.doesNotMatch(last, /Event #1 ·/);
});

test('empty initial and later pages render distinct safe states without a timeline', async () => {
  const initial = await render([]);
  const later = await render([], { after: 50 });
  assert.match(initial, /role="status".*No audit records are available for this run/);
  assert.match(later, /role="status".*No further audit records are available/);
  assert.doesNotMatch(initial + later, /<ol|<article|Events /);
});

test('private fields never reach rendered markup and unsafe metadata is rejected', async () => {
  const privateText = 'PRIVATE_SENTINEL_<script>secret</script>';
  const html = await render([event(1, { prompt: privateText, reasoning: privateText, raw_payload: privateText,
    secret: privateText, message: privateText, rationale: privateText })]);
  assert.doesNotMatch(html, /PRIVATE_SENTINEL|<script|secret/);
  for (const field of ['kind', 'tool', 'error', 'proposal_status', 'reviewer_user_id']) {
    await assert.rejects(render([event(1, { [field]: privateText })]), { code: 'INVALID_AUDIT_RESPONSE' });
  }
});

test('workspace still gates signed-out and customer identities and starts with loading', () => {
  const signedOut = renderToStaticMarkup(createElement(AuditWorkspace));
  const customer = renderToStaticMarkup(createElement(AuditWorkspace, { api: {}, identity: { role: 'CUSTOMER' } }));
  const reviewer = renderToStaticMarkup(createElement(AuditWorkspace, { api: {}, identity: { role: 'REVIEWER' } }));
  assert.match(signedOut, /Confirm your identity to open Audit/);
  assert.match(customer, /Audit requires an authorized reviewer or administrator/);
  assert.match(reviewer, /Loading available cases/);
  assert.doesNotMatch(signedOut + customer + reviewer, /class="audit-timeline"/);
});
