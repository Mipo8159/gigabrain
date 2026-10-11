---
name: kill-by-port-not-pkill-f
description: Stop a dev server Claude started by its port or PID, never `pkill -f <pattern>`: the pattern also matches the Bash tool's own shell, which kills the command (exit 144).
metadata:
  type: feedback
---

`pkill -f 'dist/main.js'` matches every process whose *command line* contains
the pattern. That includes the Bash tool's own `bash -c "…pkill -f dist/main.js…"`,
so the command kills itself and returns exit 144 with half its output.

**Why:** hit twice in two labs (2026-09-29, 2026-10-06), and each time it looked
like the app had crashed.

**How to apply:** start background servers with `cmd & echo $! > pidfile` and
`kill "$(cat pidfile)"`, or find the listener with
`ss -ltnp 'sport = :3000'` and kill that PID.

**Signal:** stopping a process Claude started earlier in the session.
**Next time:** kill by PID or port, never by command-line pattern.
