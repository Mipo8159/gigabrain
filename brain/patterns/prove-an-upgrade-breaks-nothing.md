---
name: prove-an-upgrade-breaks-nothing
description: "To prove a shared-library upgrade breaks nothing across many consumer repos: per repo, run base (master) vs bump in detached worktrees through the repo's OWN CI test script, plus a behaviour smoke inside the built image, and diff. Includes the macOS-vs-Linux-CI traps that fake a failure."
metadata:
  type: reference
---

**In short:** "nothing breaks" is a diff, not a pass. Same repo, same commit,
two arms: base as-is, bump with only the library changed. Compare exit code,
test counts, lockfile delta, and the library's observable behaviour.

**Why:** 2026-10-28, a tracing library going 1.2.x → 1.3.0 across 26 repos.
Static reading said "additive"; the A/B proved it and found more: the old
version leaked signed-URL secrets into spans (the new one redacts), and
"same code path" for a popular HTTP client was only an inference until a
real-client probe across three of its versions measured identical headers,
responses, error shape and span attributes. The certainty question ("100%
sure?") was answered by measurement, not by rereading.

**How to apply:**
- Inventory first: org-wide search (code search misses repos; also fetch every
  live repo's manifest), skip archived, note exact pins and peer-dep flags.
- Per repo: `git worktree add --detach` at the fresh default branch, one per
  arm. Bump the way a real PR would (same package manager, same flags the
  Dockerfile uses, e.g. `--legacy-peer-deps`). Record the lockfile version
  delta: anything besides the library is a finding.
- Run the repo's own CI script (`tests/test.sh` or equivalent), not your idea
  of the tests. Capture counts from JUnit (dedupe copies) or the runner's
  summary line; exit code alone hides "0 tests ran".
- Behaviour smoke inside the image each arm built (the consumer's real
  dependency tree): load the library the way services do (first import), hit
  a local echo/collector stub, diff request headers and decoded exports.
- Secrets: token only via `op run`/build secrets; scan logs, worktrees, image
  history and env for the value, report file names only. A Dockerfile with
  `ARG NPM_TOKEN` bakes it into history: test that repo on the host.
- Report a running verdict table, not harness news (see
  [[answer-shape-short-first-map-for-how]]).

**Traps that fake a failure on a Mac (CI is Linux):** GNU `timeout` missing;
Docker Desktop `docker cp` of a dir fails with `fchmodat2: operation not
permitted`; fixed container/network names make parallel runs collide (run
serially); DB-readiness races in test scripts flip arms at random (rerun, and
only count an arm failed if it failed past setup); `npm test` that is
`mocha --watch` never exits; requiring `http` before the instrumentation
leaves it unpatched in the smoke; interposing `docker rm` blocks the script's
`docker network rm`; an exported bash function inherits `set -e`, so a
filtering `grep -v` that matches nothing kills the caller. Swap harness files
with write-then-`mv` while a batch runs (bash reads scripts incrementally).

**Signal:** "will upgrading X break anything for the repos that use it?",
"deep test with evidence", a shared package bump across many services.
**Next time:** inventory → pilot one repo end to end → serial batch with a
monitor on non-zero exits → rerun only the arms that failed in setup → one
table: repo, from-version, tests base → bump, lock delta, token scan, verdict.
