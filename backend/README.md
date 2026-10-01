# Backend

Phase 1 retains `GET /api/health` and adds an in-memory customer/order/support-case API. Health checks only the responding process, not database, model, or AWS readiness. Interactive API documentation is available at `/docs`. See the [Phase 1 domain/API guide](../docs/phase-1-domain.md) for contracts, examples, status rules, and limitations.

See [local development](../docs/local-development.md) for installation, startup, and verification.

Phase 2 adds `operations.py` (immutable local fixtures, pure rules, and read-only service) and `operation_routes.py` (GET endpoints). It reuses Phase 1 customer/order lookup. See [business operations](../docs/phase-2-business-operations.md) for policy assumptions and the distinction between conditional eligibility and authorization.

## Future boundaries

Current modules under `app/` separate HTTP routes, input schemas, domain records/rules, and an in-memory application service. `create_app()` creates an independent store. Restart/reload discards all data; use one worker. Future agent, business tool, and persistence layers are not implemented.

Keep business rules independent of FastAPI and Strands. Keep authorization outside model decisions. Review V1 components individually before reuse.

## Dependencies

`requirements.in` lists direct runtime dependencies. `requirements.txt` is a `pip freeze` snapshot of the installed bootstrap environment, not a hash-verified dependency lock. Phase 0C preserves both files and uses the installed environment without installation. Any later dependency update must be separately scoped, resolved in an isolated environment, verified, and reviewed. Do not generate a snapshot from global Python packages.
