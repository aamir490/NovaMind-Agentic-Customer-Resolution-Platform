Current status: **Phase 10 complete**, following user-reported independent verification: focused HITL tests **20/20 passed**, full backend regression **129/129 passed**, frontend API tests **6/6 passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. Reviewer identity remains unauthenticated; checkpoints are in-memory and lost on restart; there is no durable recovery or frontend HITL UI; approval/rejection does not execute business actions. Live Gemini remains unverified. Phase 11 is **next, pending approval; NOT started**. Bedrock remains deferred. No new commit/push completion is claimed.

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
| **11** | Knowledge Base & RAG | Ground responses using support/policy knowledge |
| **12** | Conversation Memory & Persistence | Durable cases, conversations and workflow state |
| **13** | Authentication & Authorization | Users, roles and protected operations |
| **14** | Guardrails & AI Safety Controls | Input/output/tool/action safeguards |
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
