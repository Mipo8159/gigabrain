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

**Second run, 2026-11-03 (20 repos, same library 1.4.0): what still went wrong.**
The traps above were in this entry and were hit again (`fchmodat2`, GNU `timeout`)
because the harness was written before the entry was read. Read this entry first.
- **Clean up only what you created.** Stopping the run with
  `docker ps -q | xargs docker rm -f` also removed the user's own local stack
  (4 compose containers; data survived only because it was a bind mount). Give every
  container you start a label or name suffix and clean with `--filter label=…`.
  Same family as [[kill-by-port-not-pkill-f]].
- **Parallel lanes are possible:** rewrite a copy of the CI script so generic names
  (`lint-target`, `test-target`, …) get a per-repo suffix; keep repos that use bare
  hostnames like `db` in one serial lane. 21 repos × 2 arms took ~45 min in 5 lanes.
- **Generated scripts:** a non-raw Python string turned `\b` into a backspace inside
  a perl regex; the rewrite silently matched nothing. Use raw strings or a quoted
  heredoc, and `cat -v` the generated line once.
- **Password-manager secrets time out when the user steps away.** Each new shell asks
  for approval; two retries failed while the user was away. Load the secret once in one
  long background process and queue follow-up reruns inside it.
- **`ERESOLVE` on the bump is usually an old peer conflict** (an ORM's peer range vs a
  newer driver), not the library: rerun with the flag the repo's Dockerfile uses and
  say so in the PR. A failed bump must stop that arm, or "bump green" means nothing.
- **A smoke that decodes the exports turns "safe" into "better":** checking the stub's
  payload for planted markers (a fake bearer token, an SQL literal, a 500 KB error) showed
  the old version leaking all three and the new one redacting them.

**Signal:** "will upgrading X break anything for the repos that use it?",
"deep test with evidence", a shared package bump across many services.
**Next time:** inventory → pilot one repo end to end → serial batch with a
monitor on non-zero exits → rerun only the arms that failed in setup → one
table: repo, from-version, tests base → bump, lock delta, token scan, verdict.

**Updating dependencies *inside* a shared library** (2026-10-22/23, merged from
shared-library-dependency-updates). Three separate questions: who receives it, does
the output change, can consumers still run it.
- The library's own lockfile never reaches consumers; they get transitive fixes only
  by refreshing their own lockfiles. Say so in the PR. (Claude once told the user the
  opposite; the reviewer caught it.)
- A 0.x minor bump can rename emitted data (OTel 0.208 → 0.223: `http.method` →
  `http.request.method`, `http.url` → `url.full`), which silently empties dashboards.
  Decode the output before/after; don't trust the changelog alone.
- A new major can raise the Node floor: `npm view <pkg>@<v> engines` vs the consumers'
  Dockerfiles / `.nvmrc`.
- Run `npm audit --omit=dev` on the current lock and on each option (in a scratch
  copy). A middle path (`npm update <pkgs>` within ranges) often clears the
  criticals with no output change.
