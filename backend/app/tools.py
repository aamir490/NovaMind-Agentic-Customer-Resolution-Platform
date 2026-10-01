"""Explicit local tool allowlist. No agent SDK, HTTP transport, or execution tools."""

from dataclasses import dataclass
from typing import Callable, Literal
from uuid import UUID

from pydantic import BaseModel, ValidationError

from .domain import Customer, Name, Order, Record, SupportCase
from .operations import BusinessOperations, EligibilityInput, EligibilityResult, InventoryItem, ReturnPolicy
from .proposals import ProposalCreate, ProposalService, ResolutionProposal
from .schemas import RequestModel
from .service import CaseService, ConflictError, NotFoundError


class CustomerLookup(RequestModel):
    customer_id: UUID


class OrderLookup(RequestModel):
    order_id: UUID


class CaseLookup(RequestModel):
    case_id: UUID


class InventoryLookup(RequestModel):
    sku: Name


class PolicyLookup(RequestModel):
    policy_id: Name


class EligibilityAssessment(EligibilityInput):
    order_id: UUID


class ProposalLookup(RequestModel):
    proposal_id: UUID


class ToolSuccess(Record):
    ok: Literal[True] = True
    tool: str
    data: Customer | Order | SupportCase | InventoryItem | ReturnPolicy | EligibilityResult | ResolutionProposal


class ToolError(Record):
    code: Literal["UNKNOWN_TOOL", "INVALID_INPUT", "NOT_FOUND", "CONFLICT"]
    message: str
    issues: tuple[str, ...] = ()


class ToolFailure(Record):
    ok: Literal[False] = False
    tool: str
    error: ToolError


class ToolDescription(Record):
    name: str
    description: str
    read_only: bool
    input_schema: dict
    output_schema: dict


@dataclass(frozen=True)
class _Binding:
    input_model: type[BaseModel]
    output_model: type[BaseModel]
    handler: Callable
    description: str
    read_only: bool = True


class LocalTools:
    """Use invoke(name, arguments); only listed bindings are dispatchable.

    This is an application interface, not a sandbox against arbitrary Python code.
    """

    def __init__(self, cases: CaseService, operations: BusinessOperations,
                 proposals: ProposalService) -> None:
        self._bindings = {
            "get_customer": _Binding(CustomerLookup, Customer, lambda p: cases.get_customer(p.customer_id),
                                     "Look up a local customer."),
            "get_order": _Binding(OrderLookup, Order, lambda p: cases.get_order(p.order_id),
                                  "Look up a local order and its items."),
            "get_case": _Binding(CaseLookup, SupportCase, lambda p: cases.get_case(p.case_id),
                                 "Look up a support case without changing its status."),
            "get_inventory": _Binding(InventoryLookup, InventoryItem, lambda p: operations.get_inventory(p.sku),
                                      "Read local inventory; no stock reservation."),
            "get_policy": _Binding(PolicyLookup, ReturnPolicy, lambda p: operations.get_policy(p.policy_id),
                                   "Read a versioned demonstration policy."),
            "assess_eligibility": _Binding(
                EligibilityAssessment, EligibilityResult,
                lambda p: operations.check_eligibility(
                    p.order_id, EligibilityInput.model_validate(p.model_dump(exclude={"order_id"})),
                ),
                "Assess caller-supplied scenario facts using existing rules; not authorization.",
            ),
            "create_resolution_proposal": _Binding(
                ProposalCreate, ResolutionProposal, proposals.create,
                "Create a pending proposal only. No approval or action execution. Retrying creates another proposal.",
                read_only=False,
            ),
            "get_proposal_status": _Binding(
                ProposalLookup, ResolutionProposal, lambda p: proposals.get(p.proposal_id),
                "Read the proposal record and current review status; never change it.",
            ),
        }

    def describe(self) -> list[ToolDescription]:
        """Return fresh schema descriptions, without exposing service handles."""
        return [ToolDescription(
            name=name, description=binding.description, read_only=binding.read_only,
            input_schema=binding.input_model.model_json_schema(),
            output_schema=binding.output_model.model_json_schema(),
        ) for name, binding in self._bindings.items()]

    def invoke(self, name: str, arguments: dict[str, object]) -> ToolSuccess | ToolFailure:
        binding = self._bindings.get(name)
        if binding is None:
            return ToolFailure(tool=name, error=ToolError(code="UNKNOWN_TOOL", message="Tool is not available"))
        try:
            request = binding.input_model.model_validate(arguments)
        except ValidationError as error:
            issues = tuple(
                f"{'.'.join(map(str, item['loc'])) or 'input'}: {item['msg']}"
                for item in error.errors(include_input=False, include_context=False, include_url=False)
            )
            return ToolFailure(tool=name, error=ToolError(
                code="INVALID_INPUT", message="Tool input validation failed", issues=issues,
            ))
        try:
            value = binding.handler(request)
        except NotFoundError as error:
            return ToolFailure(tool=name, error=ToolError(code="NOT_FOUND", message=str(error)))
        except ConflictError as error:
            return ToolFailure(tool=name, error=ToolError(code="CONFLICT", message=str(error)))
        # Unexpected service errors/output contract violations must surface as defects.
        data = binding.output_model.model_validate(value)
        return ToolSuccess(tool=name, data=data)
