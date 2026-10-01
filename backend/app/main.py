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


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["novamind-api"] = "novamind-api"


def health() -> HealthResponse:
    """Confirm the API process responds; this does not check AWS dependencies."""
    return HealthResponse()


def create_app() -> FastAPI:
    app = FastAPI(
        title="NovaMind API",
        description="Phase 4 local proposals and human review records. No authentication or action execution.",
        version="0.4.0",
    )
    app.state.case_service = CaseService()
    app.state.business_operations = BusinessOperations(app.state.case_service)
    app.state.proposal_service = ProposalService(app.state.case_service)
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
