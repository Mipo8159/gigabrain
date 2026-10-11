---
name: checklist-silent-failures
description: Reviewer checklist for silent failures — swallowed errors, dangerous fallbacks, lost context, unhandled async — loaded by the reviewer agent on every diff.
metadata:
  type: library
  source: ecc
  upstream: [agents/silent-failure-hunter.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# Silent-failure review checklist

Applies when: every diff. The question for each error path: if this fails in production, will
anyone find out, and will they know why?

## Blockers

- **Empty or ignoring handlers**: the failure disappears. Concrete forms:
  - Node/TS: `catch {}`, `catch (e) {}`, `.catch(() => {})`
  - Python: `except: pass`, `except Exception: pass`
  - Go: `_ = f()` or an `err` that is never checked
- **Error converted to an empty value**: `.catch(() => [])`, `return null` / `None` / `nil, nil` from a
  failed call. Callers then treat "failed" as "nothing there" and act on it, e.g. sending, deleting or
  overwriting based on an empty list.
- **Default that hides real failure**: a config, feature flag, price, permission or limit falling back to
  a default when the read failed. The system runs with wrong values and looks healthy.
- **Unhandled async**:
  - A promise not awaited and with no `.catch` (fire-and-forget in Node/TS) → an unhandled rejection, or
    the error is lost and the request reports success.
  - A goroutine whose error has nowhere to go.
  - A background task whose exception is never retrieved.
- **No rollback around multi-step writes**: the first step commits, the second throws, and the
  partial state stays with no record.

## Should-fix

- **Lost context or stack**:
  - Rethrowing a new generic error without the original as its cause.
  - Go `return err` with no wrap, or `%v` instead of `%w`.
  - Python `raise X` inside `except` without `from e`.
  - Logging only `err.code` and not the message.
- **Generic rethrow**: catching everything and throwing "something went wrong", which turns distinct
  failures into one indistinguishable one.
- **Log-and-forget**: the error is logged and execution continues as if it succeeded, when the caller
  needed to know.
- **Retries that swallow the final error**: the last attempt fails, the loop exits, and the function
  returns normally or returns a stale value.
- **Network, file or DB calls with no timeout and no error handling** → hangs, or failures that surface
  far from their cause.
- **Graceful-looking degradation with no signal**: a fallback path that is fine on its own but emits no
  log or metric, so downstream bugs become hard to diagnose.

## Nits

- **Logs without enough context** to act on (no IDs, no input summary, no operation name).
- **Wrong severity**: a real failure logged at info or debug, or an expected miss logged at error.

## Not this checklist's job

- Language-specific error idioms in depth: python.md, go.md, typescript.md.
- Failures that leak secrets or PII through error messages or logs: security.md.
