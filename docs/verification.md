# Local verification evidence

## Phase 5 — Focused local tool verification only

- `./backend/.venv/Scripts/python.exe -B -m unittest discover -s tests -p test_tools.py -v`: **12 tests passed**.
- Verified the exact allowlist, schema descriptions, input validation before service calls, delegated lookups/eligibility/proposal creation, structured expected errors, pending-only creation, exclusion of review/execution, status after separate human review, unchanged case/order/inventory records, and application isolation.
- Unexpected service failures propagate rather than becoming fabricated business results.
- Tests used in-process services only. No full regression, frontend build, browser verification, package installation, or external service/AWS call was performed. Earlier checks below remain historical evidence.

See [Phase 5 contracts and limitations](phase-5-tools.md). Phase 6 has not started.

## Phase 4 — Focused proposal/review verification only

- `./backend/.venv/Scripts/python.exe -B -m unittest discover -s tests -p test_proposals.py -v`: **11 tests passed** (7 service tests, 4 HTTP tests).
- Verified pending creation, existing-case linkage, retrieval/filtering, immutable proposed content, server-managed fields, both explicit decisions, terminal/repeated-transition rejection, concurrent reviews with exactly one winner, missing records, invalid inputs, application isolation, and unchanged case/order/inventory records after approval.
- Only the new proposal tests ran. The HTTP harness used a temporary loopback port and shut down after completion. No frontend builds, browser verification, or full regression were run, per scope.
- No new packages, agents, external services, authentication, persistence, execution, or infrastructure were introduced. Previous results below remain historical evidence, not a claim of a Phase 4 full regression.

See [Phase 4 limitations](phase-4-proposals.md), particularly the distinction between a caller-labelled human review and authenticated authorization.

## Phase 3 — Local case review UI

- `node --test tests/frontend-api.test.mjs`: **6 frontend API tests passed** using the built-in Node test runner.
- Existing Python unittest suite: **25 tests passed**. No backend implementation changed.
- Offline frontend production build: passed; 17 modules transformed.
- Manual browser flow: empty-case guidance, refresh/select/load, customer/order context, inventory/policy display, explicit assessment inputs, conditionally eligible day-30 result, and ineligible day-31 result with denial text/code and API-echoed inputs all worked.
- Changing inputs or selecting another SKU cleared the previous result. Unknown inventory produced an alert, not zero stock; selecting a known SKU recovered. `LAP-2` displayed zero stock distinctly.
- After browser assessments, the prepared case remained open with unchanged timestamps and `LAP-1` stock remained five units. Synthetic records were prepared through existing Phase 1 endpoints only for verification; the new UI uses GET requests exclusively.
- All 20 Markdown files passed local-link checks. No packages were added or installed. Verification servers were stopped afterward.

These are local demonstrations, not production, security, accessibility-certification, or automated end-to-end browser tests. The six frontend tests mock transport; rendered UI behavior was verified manually. Phase 4 was not started.

## Phase 2 — Deterministic business operations

- Existing-environment unittest discovery: **25 tests passed**, including all 14 Phase 1 tests and 11 new business-rule/HTTP tests.
- `pip check`: no broken requirements.
- Frontend `npm.cmd run build` in offline mode: passed; 15 modules transformed.
- Local Vite proxy smoke check: health, inventory, policy lookup, and eligibility passed. Day 30 was eligible; day 31 was ineligible with `outside_return_window`; authorization remained false.
- No dependencies were added or installed. Phase 2 uses local fixtures and the existing Phase 1 store only. The frontend changed only its phase label/title and explanatory copy; no business-operations UI was added.
- Verification servers were stopped after checks. No AWS, agent, authentication, database, payment/refund execution, or infrastructure operation was introduced.

Eligibility results are conditional on unverified caller-supplied facts under a demonstration policy. These checks do not prove real-world entitlement or production readiness. See [Phase 2 contracts and limits](phase-2-business-operations.md).

## Phase 1 — Application domain foundation

- `backend/.venv/Scripts/python.exe -B -m unittest discover -s tests -v`: **14 tests passed** (8 domain/service tests and 6 real HTTP tests). Coverage includes validation, missing records, order/customer consistency, the status transition matrix, immutable records, isolated app stores, HTTP error codes, and customer/order/case round trips.
- `backend/.venv/Scripts/python.exe -B -m pip check`: no broken requirements.
- `npm.cmd run build` from `frontend/`, using npm offline mode: passed; 15 modules transformed.
- Loopback smoke check through Vite: health returned the original response; customer/order/case creation succeeded; status changed from `open` to `in_review`; direct backend retrieval returned the same updated case.
- Browser: the Phase 1 welcome page rendered and **Check local API** displayed the successful connectivity message.
- Local documentation links: all 18 Markdown files passed target checks.

No new packages or external services were used. The test server cleans itself up; manual verification servers were stopped afterward. Local example records were temporary. These checks do not verify authentication, security, persistence, agent behavior, AWS, scalability, or production readiness. The Phase 0 evidence below remains historical and is not rewritten as current implementation status.

## Phase 0B historical checks — 2026-09-29

These checks were performed when the scaffold was implemented before explicit approval. A subsequent read-only audit identified the scope overreach; the user later accepted the scaffold as Phase 0B. The results below are historical evidence, not proof of original authorization or production readiness.

Verified locally on Windows on 2026-09-29 with Python 3.12.0, Node.js 24.21.0, and npm 10.8.0.

### Observed results

- Frontend dependency installation completed and generated `package-lock.json`.
- `npm run build` from `frontend/` completed successfully.
- Backend dependencies were installed in `backend/.venv`; `pip check` reported no broken requirements.
- `GET http://127.0.0.1:8000/api/health` returned `status: ok` and `service: novamind-api`.
- The same request through `http://127.0.0.1:5173/api/health` returned the expected response.
- The browser displayed the welcome page and the successful local API status after selecting **Check local API**.
- After stopping FastAPI, the browser displayed the unavailable-API message and allowed retry.
- After restarting FastAPI, selecting the same button restored the successful status.

These are local smoke checks, not a business-workflow test suite. No agent, Bedrock model, DynamoDB table, S3 bucket, authorization workflow, or deployed AWS environment was tested.

Follow [local development](local-development.md) to reproduce the checks.

## Phase 0C verification — completed 2026-10-01

The checks below used the existing Phase 0B dependencies. Previously completed build and health checks were retained across the continuation; they were not repeated merely to produce a new result.

### Application checks

- Existing environment: `backend/.venv/Scripts/python.exe -B -m pip check` passed with no broken requirements. FastAPI, Uvicorn, and Pydantic imports succeeded.
- Existing frontend: `npm.cmd run build` from `frontend/` passed, transforming 15 modules and producing the static bundle. npm offline mode was enabled, with audit, funding, and update notifications disabled. No installation command was run.
- Backend startup used the existing Python environment with `-B -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000`.
- Frontend startup used the installed Vite executable through `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort` from `frontend/`.
- Direct `GET http://127.0.0.1:8000/api/health` and proxied `GET http://127.0.0.1:5173/api/health` both returned `{"status":"ok","service":"novamind-api"}`. Both fields were checked for both responses.
- The browser rendered the welcome page. Selecting **Check local API** displayed: "The local API is responding. AWS and agent capabilities are not connected."
- Failure/recovery checks remain the historical Phase 0B evidence above; they were not rerun in Phase 0C.

### Consistency and scope checks

- All 17 Markdown files passed relative-link and trailing-whitespace checks. No live links remain to the old architecture, learning, or infrastructure paths.
- SHA-256 checks confirmed that both backend Python source files, frontend HTML/JSX/CSS/Vite configuration, all four dependency definition/snapshot/lock files, and both runtime selection files were unchanged from the start of Phase 0C.
- `infra/README.md` moved to `infrastructure/README.md`; its directory contained only that planning document and had no implementation references.
- The old architecture document moved into `docs/architecture/target-v2.md`, preserving its unique content; a separate current-baseline document was added.
- The old learning document moved into `learning/00-Project-Overview.md`, retaining its educational distinctions and increment template while adding the requested overview and ten questions.
- Tests, evaluations, scripts, and workflow directories contain purpose documents only. No test framework, executable script, evaluation implementation, or CI workflow was added.
- Final review found 32 project files outside generated directories, all untracked on `master`, with zero commits. No staging or commit was performed.
- Verification server processes were no longer running at completion.

No application verification failed. After the interrupted session, its old terminal process identifier was unavailable; only the unfinished documentation consistency check was rerun and passed.

No packages were installed or updated, no package registry was queried, and no external application service or AWS operation was called in Phase 0C. Application verification traffic used local loopback only. There is still no agent, Strands implementation, Bedrock integration, AWS SDK integration, business tool, or customer-resolution business logic. Production readiness, security, scalability, and AWS deployment remain unverified.
