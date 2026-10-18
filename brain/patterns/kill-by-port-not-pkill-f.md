---
name: kill-by-port-not-pkill-f
description: Stop a dev server Claude started by its port or PID, never `pkill -f <pattern>`: the pattern also matches the Bash tool's own shell, which kills the command (exit 144). `pgrep -f` wait loops self-match the same way.
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

**Signal:** stopping a process Claude started earlier in the session, or chaining
background jobs so that one waits for another.
