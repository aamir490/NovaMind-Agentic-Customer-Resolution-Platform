"""Local API entry point. No agent or external services are connected."""

from typing import Literal

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .routes import router
from .operation_routes import router as operation_router
from .operations import BusinessOperations
from .proposal_routes import router as proposal_router
from .proposals import ProposalService
from .service import CaseService, ConflictError, NotFoundError
from .tools import LocalTools
from .security import AuthenticationProvider, LocalAuthenticationProvider, SecurityError, authenticated
from .observability import LocalObserver, observing, span


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["novamind-api"] = "novamind-api"


def health() -> HealthResponse:
    """Confirm the API process responds; this does not check AWS dependencies."""
    return HealthResponse()


def create_app(*, auth_provider: AuthenticationProvider | None = None,
               observer: LocalObserver | None = None) -> FastAPI:
    app = FastAPI(
        title="NovaMind API",
        description="Local authenticated case/proposal operations. No action execution.",
        version="0.13.0",
    )
    app.state.case_service = CaseService()
    app.state.business_operations = BusinessOperations(app.state.case_service)
    app.state.proposal_service = ProposalService(app.state.case_service)
    app.state.local_tools = LocalTools(
        app.state.case_service, app.state.business_operations, app.state.proposal_service,
    )
    app.state.auth_provider = auth_provider if auth_provider is not None else LocalAuthenticationProvider()
    app.state.observer = observer if observer is not None else LocalObserver()

    @app.middleware("http")
    async def authentication(request: Request, call_next):
        if request.url.path.startswith("/api/") and request.url.path != "/api/health":
            headers = request.headers.getlist("authorization")
            if len(headers) != 1:
                return security_response(SecurityError(401))
            parts = headers[0].split(" ")
            if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
                return security_response(SecurityError(401))
            try:
                with authenticated(app.state.auth_provider, parts[1]):
                    return await call_next(request)
            except SecurityError as error:
                return security_response(error)
        return await call_next(request)

    @app.middleware("http")
    async def request_trace(request: Request, call_next):
        # Registered last: wraps authentication, including rejected requests.
        # Incoming trace headers/paths/query strings are never trusted or recorded.
        with observing(app.state.observer), span("http") as current:
            current.annotate(method=request.method)
            try:
                response = await call_next(request)
            except Exception:
                current.annotate(status_code=500)
                raise
            current.annotate(status_code=response.status_code)
            if response.status_code >= 400:
                current.fail({401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND",
                              409: "CONFLICT", 422: "INVALID_INPUT"}.get(response.status_code))
            response.headers["X-Trace-ID"] = current.trace_id
            return response

    def security_response(error: SecurityError):
        return JSONResponse(status_code=error.status_code, content={"detail": error.detail},
                            headers={"WWW-Authenticate": "Bearer"} if error.status_code == 401 else None)

    @app.exception_handler(SecurityError)
    async def security_error(request: Request, error: SecurityError):
        return security_response(error)
    app.add_api_route("/api/health", health, response_model=HealthResponse, tags=["health"])
    app.include_router(router)
    app.include_router(operation_router)
    app.include_router(proposal_router)

    @app.exception_handler(NotFoundError)
    async def not_found(request: Request, error: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(error)})

    @app.exception_handler(ConflictError)
    async def conflict(request: Request, error: ConflictError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": str(error)})

    return app


app = create_app()
