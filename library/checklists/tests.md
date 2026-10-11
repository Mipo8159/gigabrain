---
name: checklist-tests
description: Reviewer checklist for test coverage of a change — loaded by the reviewer agent when the diff changes behaviour (non-test source) or adds/changes tests.
metadata:
  type: library
  source: ecc
  upstream: [agents/pr-test-analyzer.md, skills/ai-regression-testing]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# Test coverage review checklist

Applies when: the diff changes behaviour in non-test source, or adds or changes
tests. Map each changed function/route/handler to the test that exercises it;
the gaps are the findings.

Why this matters more with AI-written code: the same model that wrote a change
carries the same assumptions into reviewing it. A failing test is the one
reviewer that doesn't share the blind spot.

## Blockers

- **Bug fix without a regression test**: a fix with no test that fails before
  and passes after → the same bug comes back (AI-assisted code repeats the same
  category of mistake). Name the test after the bug it prevents.
- **Changed behaviour, unchanged tests**: logic in the diff changed but no test
  was added or updated, and existing tests still pass → they don't cover it.
- **Error and edge paths untested** on code that handles money, auth, data
  writes or external calls: only the happy path is asserted.
- **Assertion-free tests**: a test that only checks "doesn't throw", snapshots
  everything, or asserts on a mock it configured itself → passes whatever the
  code does.
- **Tests that were edited to pass**: expected values changed, assertions
  removed or `.skip`/`xfail`/`t.Skip` added in the same diff as the behaviour
  change, without a reason → the test was bent to the bug.

## Should-fix

- **Parallel paths not tested for parity**: when the code has two paths that
  must agree (sandbox/mock vs production, cache vs DB, v1 vs v2 handler, sync vs
  async consumer), a field added to one path only is the most common
  AI-introduced regression. Assert the same response shape on both.
- **New field returned but not loaded**: a field added to a response/DTO
  while the query/`SELECT`/projection/`relations` doesn't fetch it → always
  `undefined`/`null`. Test the response shape, not the implementation.
- **Stale state on error** (UI): an error path sets the error but leaves old
  data visible; an optimistic update has no rollback on failure → test the
  failure path, not just success.
- **Integration seams mocked away**: the unit under change is the integration
  (repository query, queue publish, HTTP client), but the test mocks exactly
  that → covers nothing real. Prefer a real DB/container or a contract test.
- **Flaky patterns**: real time (`Date.now`, `sleep`), random data without a
  seed, ordering assumptions on unordered results, shared state between
  tests, network calls → intermittent red, then ignored red.
- **Test isolation**: tests depend on run order or on data left by another test.

## Nits

- Test names that describe the implementation instead of the behaviour.
- Coverage chased for its own sake: prefer one test where a bug was (or
  plausibly will be) over five on code that never broke.

## Not this checklist's job

- Language-specific test idioms (pytest fixtures, Go table tests, React
  Testing Library queries): `python.md`, `go.md`, `react.md` and the
  `*-testing` library skills.
- Whether the swallowed error is a bug in the code: `silent-failures.md`.
