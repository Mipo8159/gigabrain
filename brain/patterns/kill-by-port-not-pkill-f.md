---
name: kill-by-port-not-pkill-f
description: Stop a dev server Claude started by its port or PID, never `pkill -f <pattern>`: the pattern also matches the Bash tool's own shell (exit 144) and any Docker container running the same command. `pgrep -f` wait loops self-match the same way.
metadata:
  type: feedback
---

**In short:** stop a server by its PID or port, never with `pkill -f`.

`pkill -f 'dist/main.js'` matches every process whose *command line* contains
the pattern. That includes the Bash tool's own `bash -c "…pkill -f dist/main.js…"`,
so the command kills itself and returns exit 144 with half its output.

**Why:** hit twice in two labs (2026-09-29, 2026-10-06). Each time it looked
like the app had crashed.

**How to apply:** start background servers with `cmd & echo $! > pidfile` and
stop them with `kill "$(cat pidfile)"`, or find the listener with
`lsof -nP -iTCP:3000 -sTCP:LISTEN -t` (macOS) or `ss -ltnp 'sport = :3000'`
(Linux) and kill that PID.

**Same trap with `pgrep -f` wait loops (2026-10-13).** `until ! pgrep -f 'eval-knowledge …'; do sleep 30; done`
matched its own shell, so queued eval jobs waited forever or died unnoticed.
To run jobs in order, put them in one sequential script (`a; b; c`), or wait on a saved PID.

**Containers match too (2026-10-14).** A process inside a Docker container is a normal host process, so
`pkill -f "node dist/main.js"` aimed at a local test server would also have killed the containerised
service running the same command. The permission prompt was denied, rightly. It happened even though this entry
existed: look up the port's PID with `ss -ltnp 'sport = :PORT'` *first*, every time.

**Inside a container too (2026-10-23, third repeat despite this entry).** To clean up a hung
`node -` one-off, Claude ran `docker compose exec <svc> sh -c 'pkill -f "node -"'`. The pattern
matched the service's own `node --inspect … dist/index.js`, so the service went down mid-test
(nodemon logged "clean exit"), and the sh wrapper died with it, so there was no output either.
The real fix was upstream: the one-off hung because the service it called was stuck. Give
one-off scripts a timeout (`timeout 60 node -`, `AbortSignal.timeout`) instead of killing them
afterwards.

**To end a stuck check (2026-11-18, fifth repeat, with this entry *and* the handoff warning loaded).**
A backgrounded loop of `curl` calls hung on an unreachable host; Claude "cleaned it up" with
`pkill -f 'heartbeat/status'` and killed its own shell (exit 144). The fix was upstream again: every
`curl` needs `-m <seconds>`; to stop a background task, use the task-stop tool, not a pattern kill.

**Next time:** never `pkill -f` anywhere, host or container. Use `timeout` on the command
itself, or kill a saved PID.

**Signal:** stopping a process Claude started earlier in the session, or chaining
background jobs so that one waits for another.

**Fourth hit, during cleanup (2026-11-16).** `pkill -f 'HTTP_PORT=3099'` to stop a test API whose port Claude knew
killed the tool's own shell (exit 144). The cleanup lines after it (test-row deletes) never ran, so the test
data stayed behind until a rerun with `ss -ltnp` → `kill <pid>`. The entry is known and still loses to habit,
so treat a `pkill -f` you are about to type as the signal itself.

**Fifth and sixth hits, same day (2026-11-16, work repo).** `pkill -f 'node dist/main.js'` to stop a local e2e server,
twice in one session, each time exit 144 (the second time it also swallowed a secrets scan chained after it, which had
to be rerun). The server was started with `( … nohup node dist/main.js & )`, so no PID was saved. Six hits with this
entry loaded means the text does not change the habit: the fix is mechanical. Proposed to Giga: a PreToolUse Bash
hook in gigabrain's global hooks that denies `pkill -f` / `pgrep -f` with the message "save $! to a pidfile, kill that".
Until then: whenever a background server is started, the same command writes `echo $! > <scratch>/server.pid`.
