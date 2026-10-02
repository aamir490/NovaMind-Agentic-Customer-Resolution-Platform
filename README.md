# NovaMind Agentic Customer Resolution Platform

A production-oriented multimodal customer resolution application, being built incrementally for **learning**, **interview and portfolio demonstrations**, and **verified deployment in a real AWS account**.

## Current stage: V2 Phase 13 — Local authentication and authorization implemented

Phase 13 implementation and **27 focused tests passed**, built on the verified and pushed Phase 12 baseline. Broader regression and independent acceptance are not claimed for these changes. Phase 14 has NOT started and requires approval. See [Phase 13 identity, permissions, setup, and limitations](docs/phase-13-security.md).

This is a new, independent repository. `Chatbot_text_image` is a V1 reference only; it has not been copied here. Reuse of any individual idea or component requires review in a later phase.

The React/Vite + FastAPI scaffold was implemented before explicit approval during Phase 0. A read-only audit exposed that scope overreach. After review, the user explicitly accepted it as the **Phase 0B local development foundation**. Phase 0C normalizes structure and documentation; it adds no business implementation. Later acceptance does not erase the earlier overreach. See [project evolution](PROJECT-EVOLUTION.md) and [ADR-002](docs/decisions/ADR-002-react-fastapi-local-foundation.md).

## Product scenario

> "I received the wrong laptop. Here is my invoice and a photo. I want a replacement."

The intended workflow creates a support case, gathers information and evidence, checks policy, proposes a resolution, obtains authorization where required, executes and verifies the approved action, updates the case, and notifies the customer. Cases that cannot be resolved safely are escalated.

## TARGET architecture — not yet implemented

```text
React / Vite
    -> FastAPI
    -> Application Services
    -> one Resolution Agent
    -> Strands Agents SDK / Amazon Bedrock
    -> Approved Tool Layer
    -> Domain / Business Rules
    -> Repositories / Providers
    -> DynamoDB + S3
```

This is a conceptual flow, not an implemented deployment diagram. Strands is the preferred agent framework and Bedrock is the intended model provider. Cognito, ECS, and CloudFront are planned; their concrete configuration, model/region selection, and deployment suitability remain unverified. See [target V2 architecture](docs/architecture/target-v2.md).

Sensitive actions must follow **PROPOSE -> AUTHORIZE -> EXECUTE -> VERIFY**. The LLM itself is never authorization. Business rules and the application must enforce the authorization boundary.

## Repository guide

- `frontend/`: React/Vite presentation layer.
- `backend/`: FastAPI, local services, domain rules, controlled agents/tools, and optional SQLite conversation storage.
- `tests/`: focused domain and local HTTP tests using standard-library unittest.
- `evaluations/`: intended home for future agent/task evaluation cases; scope notes only today.
- `infrastructure/`: future AWS planning; no provisioning code.
- `docs/`: scope, architecture rationale, and learning notes.
- `learning/`: plain-English learning material, starting with one overview chapter.
- `scripts/`: guidance for future repeatable local utilities; no scripts yet.
- `.github/workflows/`: future CI/CD scope notes; no executable workflows yet.

Start with [local development](docs/local-development.md), [Phase 0 scope](docs/phase-0.md), [the current local baseline](docs/architecture/current-local-baseline.md), and [the learning overview](learning/00-Project-Overview.md).

## IMPLEMENTED NOW

- Local replaceable bearer authentication with CUSTOMER, REVIEWER, and ADMIN roles; server-side ownership checks on routes, tools, and conversation access; authenticated human-review identity; request-scoped context separate from model/memory/checkpoint data. Business endpoints default to 401 until the host configures credentials. No frontend login UI was added. See [Phase 13 configuration](docs/phase-13-security.md).
- Local SQLite conversation persistence through a replaceable store, case-bound UUIDs, ordered UTC-stamped user/assistant messages, and bounded untrusted context for Phase 8/9/10 agents. Business state, HITL checkpoints, and audit history remain separate and in memory. See [Phase 12 details](docs/phase-12-conversations.md).
- Read-only local knowledge retrieval over three curated support documents. The `search_knowledge` tool returns bounded chunks and citation metadata marked as untrusted reference information; deterministic rules and HITL remain authoritative. See [Phase 11 contracts and limits](docs/phase-11-knowledge.md).
- A local checkpointed HITL workflow pauses after pending proposal creation and resumes only through an explicit validated human decision. It reuses Phase 4 review, ends without another LLM call or action execution, and leaves Phases 8/9 available unchanged. See [Phase 10 contracts and limits](docs/phase-10-hitl.md).
- A separate LangGraph workflow with six explicit nodes, validated state, conditional routing, bounded steps, and ordered audit results. The Phase 8 loop remains available unchanged. See [Phase 9 implementation and limits](docs/phase-9-langgraph.md).
- A bounded in-process resolution agent composes the Phase 6 LLM interface with the Phase 5 tools, retaining structured audit history and rendering explicit informational/pending-review outcomes. Gemini can be injected through the existing adapter; no live agent run or HTTP/UI wiring was added. See [Phase 8 contracts and limits](docs/phase-8-agent.md).
- An isolated Gemini adapter using the official Google GenAI SDK, environment credentials, configurable model (default `gemini-3.8-flash`), and the Phase 6 structured-output boundary. Verified with mocked clients only; no live Gemini call or application wiring. See [Phase 7A setup and limits](docs/phase-7a-gemini.md).
- A standalone provider-neutral LLM interface with validated structured output and a deterministic fake for tests only. It is not connected to APIs, tools, or business operations. See [Phase 6 contracts and limitations](docs/phase-6-llm.md).
- A React/Vite welcome page with a local API check and an unavailable-API message.
- A FastAPI `GET /api/health` endpoint returning process health.
- A Vite development proxy connecting the page to FastAPI.
- In-memory customer, order, and support-case records, validated API models, and limited case-status transitions. See the [Phase 1 API walkthrough](docs/phase-1-domain.md).
- Read-only local inventory/policy lookups and conditional return/refund eligibility checks with explicit denial reasons. See [Phase 2 operations and assumptions](docs/phase-2-business-operations.md).
- A read-only case-review UI showing customer/order context, inventory, policy, assessment inputs, and backend eligibility/denial results. See [the Phase 3 walkthrough](docs/phase-3-case-review.md).
- Local proposal creation and explicit, one-time approve/reject APIs. Server-managed IDs/status/timestamps; Phase 13 derives reviewer identity from authenticated context. No action execution. See [Phase 13 review contracts](docs/phase-13-security.md) and [Phase 4 domain rules](docs/phase-4-proposals.md). The frontend remains the Phase 3 read-only UI without login or bearer credential plumbing.
- The eight Phase 5 tools delegate lookups, eligibility assessment, pending proposal creation, and proposal status to existing services; Phase 11 adds read-only knowledge search as the ninth tool. Review and execution remain excluded. See [Phase 5 tool contracts](docs/phase-5-tools.md).

Use Python 3.12 and Node.js 24. Phase 9 adds LangGraph; existing package versions remain pinned. Phase 12 uses standard-library SQLite for conversation text only. Phase 13 adds local authentication without new dependencies. No Bedrock integration, cloud authentication, or AWS deployment exists.

## PLANNED

- Verified delivery/payment/evidence facts and real merchant policy integration beyond the local demonstration rules.
- One Strands Resolution Agent using Amazon Bedrock and approved business tools.
- Multimodal evidence from documents and images.
- Human approvals, business actions, and action verification.
- DynamoDB/S3 persistence, Cognito identity, ECS container deployment, and CloudFront delivery.
- Evaluations, observability, and CI/CD.

These are target capabilities, not implemented services or production-verified choices.

## VERIFIED NOW

- Phase 13: **27/27 focused security tests passed** using local credentials, in-process ASGI transport, scripted models, and isolated SQLite files. No full regression, frontend build, live model/network/AWS calls, or package changes. Earlier fixtures were adapted for explicit authenticated access but those suites were not rerun. See [verification and limitations](docs/phase-13-security.md). Results below are historical phase evidence; Phase 13 supersedes earlier unauthenticated interface/reviewer limitations with local authentication only.
- Phase 12 independent verification reported by the user: **25/25 focused conversation/persistence tests passed**, **169/169 full backend regression tests passed**, **6/6 frontend API tests passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. These results were recorded without rerunning tests or builds during this documentation-only update. SQLite persists conversation memory only; business/domain records, LangGraph/HITL checkpoints, and audit history remain in memory. Full application restart cannot resume a conversation until authoritative case state exists again. No cross-store transactions, automatic replay, authentication, encryption, or frontend memory UI exists. Stored conversation text remains untrusted context, not authoritative business state. See [verification and limitations](docs/phase-12-conversations.md).
- Phase 11 independent verification reported by the user: **15/15 focused Knowledge/RAG tests passed**, **144/144 full backend regression tests passed**, **6/6 frontend API tests passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. Retrieval remains local lexical/token-cosine only, with no production semantic embedding provider/vector database, live embedding/network calls, or frontend RAG UI. Retrieved content remains untrusted; deterministic business rules and HITL remain authoritative. Earlier results below are historical evidence.
- Phase 10 independent verification reported by the user: **20/20 focused HITL tests passed**, **129/129 full backend regression tests passed**, **6/6 frontend API tests passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. Live Gemini and browser verification are not established by these results.
- Phase 9: **25/25 focused graph tests passed** using fake providers; dependency health passed. No live Gemini, full regression, frontend build, or browser checks ran for this phase. Earlier-phase results below remain historical evidence.
- Phase 8 final verification reported by the user: **15/15 focused agent tests passed**, **84/84 full backend regression tests passed**, **6/6 frontend API tests passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. Live Gemini and browser verification remain unverified. Results below are historical evidence.
- Phase 7A: eleven focused mocked-provider tests passed. Final verification reported by the user: full backend regression **69/69 passed**, frontend API tests **6/6 passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. Live Gemini behavior remains unverified; no browser verification was reported.
- Phase 6: ten focused LLM-contract tests passed. No full regression, frontend build, or browser verification ran. Results below are earlier-phase evidence.
- Phase 5: twelve focused tool tests passed. No full regression, frontend build, or browser verification was run; results below are historical evidence.
- Phase 4: eleven focused proposal-service/HTTP tests passed. Full regression, frontend builds, and browser checks were deliberately not rerun for this phase; the following results are prior-phase evidence.
- Twenty-five focused domain/business-rule and real HTTP tests.
- Six frontend API tests and a manual local browser case-review walkthrough.
- Local frontend build.
- Local FastAPI health response.
- Local browser/frontend/backend health flow, including the Phase 0B unavailable-backend and recovery demonstration.

## NOT VERIFIED

- AWS deployment.
- Agent behavior or Bedrock integration.
- Security, scalability, or production readiness.

See [verification evidence](docs/verification.md) for dates, commands, and limits. A local health check is not a customer-resolution workflow test.
