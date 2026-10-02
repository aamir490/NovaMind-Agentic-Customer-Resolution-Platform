# Software tests

Phase 13 focused verification: `./backend/.venv/Scripts/python.exe -B -m unittest discover -s tests -p test_security.py -v` — **27/27 passed**. Tests use deterministic local authentication, in-process ASGI transport without network, scripted LLMs, and temporary SQLite files. Earlier regression fixtures now provide explicit ADMIN credentials and use authenticated reviewer IDs; those suites were not rerun. No full regression, frontend tests/build, or live services ran for Phase 13. See [coverage and limitations](../docs/phase-13-security.md). Phase 14 has NOT started; verification below is historical evidence.

Phase 12 is complete following independent verification reported by the user: focused conversation/persistence tests **25/25 passed**, full backend regression **169/169 passed**, frontend API tests **6/6 passed**, frontend production build **passed**, and `git diff --check` **passed with CRLF/LF normalization warnings only**. Those results were recorded during the Phase 12 documentation-only update and remain the baseline for Phase 13.

The focused command is `./backend/.venv/Scripts/python.exe -B -m unittest discover -s tests -p test_conversations.py -v`. This suite uses temporary isolated SQLite files and scripted LLM providers; it covers durable conversation memory and its Phase 8/9/10/11 safety boundaries. See [verification and preserved limitations](../docs/phase-12-conversations.md). Counts below are historical phase evidence.

Phase 1 uses Python's built-in `unittest`. `test_domain.py` checks validation, relationships, transition rules, immutable records, and isolated application stores. `test_api.py` exercises real HTTP on an ephemeral loopback port, with no external service or additional package.

Phase 2 adds `test_operations.py` for policy boundaries, quantities, condition/reason rules, missing fixtures, repeatability, and no mutation. The HTTP suite also covers read-only business lookups, eligibility, and error responses. There are 25 tests in total.

Phase 3 adds six frontend API tests using the built-in Node runner: `node --test tests/frontend-api.test.mjs`. These mock transport, not business rules. Rendered UI behavior is checked separately in the browser; see [verification evidence](../docs/verification.md). Total automated tests: 25 Python plus 6 Node.

From the repository root:

```powershell
./backend/.venv/Scripts/python.exe -B -m unittest discover -s tests -v
```

Authorization, business action retries, and agent evaluations remain future work. See [verification evidence](../docs/verification.md) for observed results and [the Phase 1 guide](../docs/phase-1-domain.md) for local API examples.
