---
name: checklist-python
description: Reviewer checklist for Python diffs — loaded by the reviewer agent when the diff touches *.py / *.pyi, pyproject.toml, or a FastAPI/Django/Flask app.
metadata:
  type: library
  source: ecc
  upstream: [agents/python-reviewer.md, agents/fastapi-reviewer.md, rules/python/coding-style.md, rules/python/fastapi.md, rules/python/patterns.md, rules/python/security.md, rules/python/testing.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# Python review checklist

Applies when: `**/*.py`, `**/*.pyi`, `pyproject.toml`; FastAPI section when the diff touches
routers, `Depends(...)`, Pydantic models or `create_app()`.
Useful read-only checks if installed: `ruff check .`, `mypy .`, `bandit -r <src>`, `pytest`.

## Blockers

- SQL built with f-strings / `%` / `+` → injection. Must be parameterized.
- `subprocess` with `shell=True` or a string built from input → command injection. Use list args.
- User-controlled file paths not confined to a base dir → path traversal. Check for
  `Path(base, p).resolve()` followed by `.is_relative_to(base.resolve())`; `normpath`
  plus rejecting `..` misses absolute paths and symlinks.
- `eval` / `exec` on input, `pickle` on untrusted data, `yaml.load` without `SafeLoader` → code execution.
- MD5/SHA1 used for passwords or signatures → weak crypto.
- Hardcoded secrets; config read from source instead of `os.environ[...]` (a missing key should raise, not default).
- `except: pass` / bare `except:` / `except Exception: pass` → swallowed failure (see silent-failures.md).
- Mutable default argument `def f(x=[])` / `={}` → state shared across calls. Use `None`.
- Shared mutable state touched from threads without a `threading.Lock`.
- **FastAPI:** response models that expose passwords, password hashes, access/refresh tokens or internal auth state.
- **FastAPI:** auth dependency that can be bypassed, or JWT checks missing expiry / signature / issuer / audience / algorithm.
- **FastAPI:** `allow_origins=["*"]` combined with credentialed CORS.

## Should-fix

- Files, sockets, locks or sessions managed by hand instead of `with` → leak on the exception path.
- Public functions without type annotations; `Any` where a concrete type is known; nullable params not typed `X | None`.
- `type(x) == T` instead of `isinstance`; `x == None` instead of `x is None`.
- String concatenation in a loop instead of `"".join(...)`.
- Magic numbers instead of a named constant or `Enum`.
- `print()` instead of `logging`.
- `from module import *`; names shadowing builtins (`list`, `dict`, `str`, `id`).
- Functions over ~50 lines, more than ~5 params (use a dataclass), or nesting over 4 levels.
- Async code calling sync I/O, or sync/async mixed incorrectly.
- Queries inside a loop (N+1). Django: missing `select_related` / `prefetch_related`, multi-step writes without `atomic()`, model change without a migration.
- **FastAPI:**
  - Blocking clients (`requests`, sync SQLAlchemy session, blocking file/network calls) inside `async def` routes → the event loop stalls.
  - `SessionLocal()` or long-lived clients created inside a handler instead of a `Depends` dependency.
  - Write endpoints without request validation. Hand-written checks where a Pydantic field constraint would do.
  - Endpoints returning app data without `response_model`. Request, update and response schemas merged into one model.
  - Fat routers: persistence and business logic belong in services or CRUD helpers.
  - CORS origins not environment-specific. Auth and write-heavy endpoints with no rate limit.
  - Credentials, cookies, `Authorization` headers or tokens written to logs.
  - External HTTP clients with no timeout.
  - List endpoints with no pagination.
- **Flask:** no error handlers; no CSRF protection on form posts.
- **Tests:**
  - `app.dependency_overrides` targeting a different callable than the one the route `Depends` on → the override silently doesn't apply.
  - Overrides not cleared after the test → leaks into other tests.
  - A sync test client used for an async app where an async client is needed.
  - New behaviour with no pytest coverage.

## Nits

- PEP 8 import order and naming. Formatting is black/isort/ruff, so don't argue style by hand.
- Missing docstrings on public functions. A C-style loop where a comprehension is clearer.
- A mutable dataclass used for a value object (`frozen=True` / `NamedTuple` fits better).
- OpenAPI: routes missing response or error descriptions.

## Not this checklist's job

- Swallowed errors, bad fallbacks, lost tracebacks in depth: silent-failures.md.
- Schema, migration and query-plan review: database.md. Cross-language authn/authz and secrets: security.md.
