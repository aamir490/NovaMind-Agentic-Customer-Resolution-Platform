# Software tests

Phase 1 uses Python's built-in `unittest`. `test_domain.py` checks validation, relationships, transition rules, immutable records, and isolated application stores. `test_api.py` exercises real HTTP on an ephemeral loopback port, with no external service or additional package.

Phase 2 adds `test_operations.py` for policy boundaries, quantities, condition/reason rules, missing fixtures, repeatability, and no mutation. The HTTP suite also covers read-only business lookups, eligibility, and error responses. There are 25 tests in total.

Phase 3 adds six frontend API tests using the built-in Node runner: `node --test tests/frontend-api.test.mjs`. These mock transport, not business rules. Rendered UI behavior is checked separately in the browser; see [verification evidence](../docs/verification.md). Total automated tests: 25 Python plus 6 Node.

From the repository root:

```powershell
./backend/.venv/Scripts/python.exe -B -m unittest discover -s tests -v
```

Authorization, business action retries, and agent evaluations remain future work. See [verification evidence](../docs/verification.md) for observed results and [the Phase 1 guide](../docs/phase-1-domain.md) for local API examples.
