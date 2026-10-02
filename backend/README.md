# Backend

Phase 1 retains `GET /api/health` and adds an in-memory customer/order/support-case API. Health checks only the responding process, not database, model, or AWS readiness. Interactive API documentation is available at `/docs`. See the [Phase 1 domain/API guide](../docs/phase-1-domain.md) for contracts, examples, status rules, and limitations.

See [local development](../docs/local-development.md) for installation, startup, and verification.

Phase 2 adds `operations.py` (immutable local fixtures, pure rules, and read-only service) and `operation_routes.py` (GET endpoints). It reuses Phase 1 customer/order lookup. See [business operations](../docs/phase-2-business-operations.md) for policy assumptions and the distinction between conditional eligibility and authorization.

## Future boundaries

Current modules under `app/` separate HTTP routes, domain rules/services, controlled tools/agents, and conversation persistence. `create_app()` still creates independent in-memory business stores; restart/reload discards business data and HITL checkpoints. Use one worker for this local baseline.

Phase 12 adds optional standard-library SQLite conversation storage through `ConversationService` and the agents' `memory=` parameter. Provision/open a local database explicitly; HTTP startup does not create one. Conversation text survives reopening, but missing cases/checkpoints are never restored from text. See [Phase 12 configuration, contracts, and limitations](../docs/phase-12-conversations.md).

Phase 13 adds local authentication and authorization. Configure `create_app(auth_provider=...)` with an explicit server-side credential registry; the default is empty and denies business API access. Clients send a bearer header. Tools, conversation services, and HITL callers use `authenticated(provider, token)`; models cannot supply this context. REVIEWER/ADMIN review inputs omit `reviewer_name`, which the server derives from the authenticated user UUID. See [Phase 13 roles, setup, endpoint protection, and limits](../docs/phase-13-security.md). The frontend has no login/credential UI, so its protected business calls receive 401. Health remains public. No new dependency was added; Phase 14 has NOT started.

Keep business rules independent of FastAPI and Strands. Keep authorization outside model decisions. Review V1 components individually before reuse.

## Dependencies

`requirements.in` lists direct runtime dependencies. `requirements.txt` is a `pip freeze` snapshot of the installed bootstrap environment, not a hash-verified dependency lock. Phase 0C preserves both files and uses the installed environment without installation. Any later dependency update must be separately scoped, resolved in an isolated environment, verified, and reviewed. Do not generate a snapshot from global Python packages.
