# NovaMind Agentic Customer Resolution Platform

A production-oriented multimodal customer resolution application, being built incrementally for **learning**, **interview and portfolio demonstrations**, and **verified deployment in a real AWS account**.

## Current stage: V2 Phase 6 — Local LLM foundation

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
- `backend/`: FastAPI, local application services, domain rules, and controlled tools. Agent integration is future work.
- `tests/`: focused domain and local HTTP tests using standard-library unittest.
- `evaluations/`: intended home for future agent/task evaluation cases; scope notes only today.
- `infrastructure/`: future AWS planning; no provisioning code.
- `docs/`: scope, architecture rationale, and learning notes.
- `learning/`: plain-English learning material, starting with one overview chapter.
- `scripts/`: guidance for future repeatable local utilities; no scripts yet.
- `.github/workflows/`: future CI/CD scope notes; no executable workflows yet.

Start with [local development](docs/local-development.md), [Phase 0 scope](docs/phase-0.md), [the current local baseline](docs/architecture/current-local-baseline.md), and [the learning overview](learning/00-Project-Overview.md).

## IMPLEMENTED NOW

- A standalone provider-neutral LLM interface with validated structured output and a deterministic fake for tests only. It is not connected to APIs, tools, or business operations. See [Phase 6 contracts and limitations](docs/phase-6-llm.md).
- A React/Vite welcome page with a local API check and an unavailable-API message.
- A FastAPI `GET /api/health` endpoint returning process health.
- A Vite development proxy connecting the page to FastAPI.
- In-memory customer, order, and support-case records, validated API models, and limited case-status transitions. See the [Phase 1 API walkthrough](docs/phase-1-domain.md).
- Read-only local inventory/policy lookups and conditional return/refund eligibility checks with explicit denial reasons. See [Phase 2 operations and assumptions](docs/phase-2-business-operations.md).
- A read-only case-review UI showing customer/order context, inventory, policy, assessment inputs, and backend eligibility/denial results. See [the Phase 3 walkthrough](docs/phase-3-case-review.md).
- Local proposal creation and explicit, one-time approve/reject APIs. Server-managed IDs/status/timestamps; no action execution or verified reviewer identity. See [Phase 4 contracts and limits](docs/phase-4-proposals.md). The frontend remains the Phase 3 read-only UI.
- Eight typed local tools delegate lookups, eligibility assessment, pending proposal creation, and proposal status to existing services. Review and execution are excluded. See [Phase 5 tool contracts](docs/phase-5-tools.md). No agent or new HTTP endpoint is added.

Use Python 3.12 and Node.js 24. Phase 1 reuses the existing dependencies. No agent, Bedrock integration, persistent database, authentication, or AWS deployment exists.

## PLANNED

- Verified delivery/payment/evidence facts and real merchant policy integration beyond the local demonstration rules.
- One Strands Resolution Agent using Amazon Bedrock and approved business tools.
- Multimodal evidence from documents and images.
- Human approvals, business actions, and action verification.
- DynamoDB/S3 persistence, Cognito identity, ECS container deployment, and CloudFront delivery.
- Evaluations, observability, and CI/CD.

These are target capabilities, not implemented services or production-verified choices.

## VERIFIED NOW

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
