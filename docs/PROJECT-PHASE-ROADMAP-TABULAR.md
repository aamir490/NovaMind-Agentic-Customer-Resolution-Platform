Current status: Phase 7A is implemented with 11 mocked tests passing. The user reported final verification: full backend regression **69/69 passed**, frontend API tests **6/6 passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. Live-provider verification remains unverified. Phase 5 is approved/committed/pushed; Phase 6 is implemented and committed. Bedrock remains deferred. Phase 8 has NOT started.

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
| **8** | First Customer-Resolution Agent | Agent reasons about cases and selects allowed tools |
| **9** | LangGraph Workflow | Explicit stateful agent workflow and routing |
| **10** | Human-in-the-Loop Agent Workflow | Agent proposal → human approval/rejection |
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
