Current status: **Phase 14 local guardrails implemented; 22/22 focused tests passed**, preserving the Phase 1–13 architecture and security boundaries. See [Phase 14 checks, verification, and limitations](phase-14-guardrails.md). No new full regression, frontend build, live network/model calls, dependencies, or commit/push completion is claimed. Phase 13's 27/27 focused tests and Phase 12's 169/169 backend and 6/6 frontend API results remain historical evidence. **Phase 15 is NOT started.**

Local bearer authentication now establishes CUSTOMER/REVIEWER/ADMIN permissions and authenticated reviewer IDs; credentials default to an empty registry. SQLite still persists conversation memory only. Business/domain records, LangGraph/HITL checkpoints, and audit history remain in memory. Full application restart cannot resume a conversation until authoritative case state exists again. There are no cross-store transactions, automatic replay, encryption, frontend login UI, or frontend memory UI. Stored conversation text remains untrusted context, not authoritative business state.

| Phase | Name | Main Goal |
|---|---|---|
| **0A** | Project Planning & Scope | Define problem, boundaries and target architecture |
| **0B** | Local Application Foundation | React + FastAPI minimal application |
| **0C** | Repository Normalization & Baseline | Clean structure, documentation and verification |
| **1** | Application Domain Foundation | Customer, order, support case and statuses |
| **2** | Deterministic Business Operations | Inventory, policies and eligibility rules |
| **3** | Local Case Review UI | Human-readable support-case review interface |
| **4** | Resolution Proposal & Human Approval Boundary | Proposal → approve/reject without executing actions |
| **5** | Agent-Ready Tool Layer | Safe structured tools over deterministic services |
| **6** | LLM Foundation | Introduce the model layer with structured outputs |
| **7** | Amazon Bedrock Integration | Connect the application to AWS Bedrock models |
| **7A** | Gemini LLM Integration | Isolated provider adapter over Phase 6; final local verification passed; see [details](phase-7a-gemini.md) |
| **8** | First Customer-Resolution Agent — COMPLETE | Final verification passed; see [details](phase-8-agent.md) |
| **9** | LangGraph Workflow — VERIFIED BASELINE | Retained unchanged; [25 implementation-time focused tests](phase-9-langgraph.md) |
| **10** | Human-in-the-Loop Agent Workflow — COMPLETE | Independent verification passed; [results and limitations](phase-10-hitl.md) |
| **11** | Knowledge Base & RAG — COMPLETE | Independent verification passed; [results and limitations](phase-11-knowledge.md) |
| **12** | Conversation Memory & Persistence — COMPLETE | Independent verification passed; durable conversation memory only; [results and limitations](phase-12-conversations.md) |
| **13** | Authentication & Authorization — IMPLEMENTED | Local provider, roles, ownership checks, authenticated reviews; [27 focused tests and limitations](phase-13-security.md) |
| **14** | Guardrails & AI Safety Controls — IMPLEMENTED LOCALLY | Input/output bounds, injection checks, retained tool/action restrictions; [focused verification and limits](phase-14-guardrails.md) |
| **15** | AI Evaluation & Testing | Quality, tool-use, RAG and workflow evaluations |
| **16** | Observability & Auditability | Logs, traces, metrics and audit trail |
| **17** | Containerization | Production Docker setup |
| **18** | AWS Infrastructure Foundation | VPC, IAM, networking and required AWS resources |
| **19** | AWS Application Deployment | Deploy frontend/backend/services to AWS |
| **20** | Production Data Layer | Durable database/cache/storage architecture |
| **21** | CI/CD & Infrastructure as Code | Automated testing, build and deployment |
| **22** | Security & Governance Hardening | Least privilege, secrets, encryption and controls |
| **23** | Reliability, Scaling & Cost Optimization | HA/scaling/recovery/cost controls |
| **24** | Production Readiness & End-to-End Testing | Full system validation and failure testing |
| **25** | Portfolio & Architecture Documentation | Professional README, diagrams and project story |
| **26** | Interview Mastery & Project Defense | Architecture explanation, Q&A and STAR stories |
