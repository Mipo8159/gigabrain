---
name: migrations-keep-cross-cutting-changes-out
description: "In a move/port ticket, anything that changes whole-flow behaviour (log format, shared monitoring, cross-service security, shared libraries' contracts) leaves the ticket: worth fixing → its own ticket, otherwise dropped. Check what reads the output (dashboards, parsers, alerts) before changing it."
metadata:
  type: feedback
---

**Rule:** a migration stays zero-behaviour-change at its edges. When a playbook step or a
found bug would change something other systems consume (log lines, metrics, auth tokens,
a shared package's contract), stop, show who consumes it, and move it to its own ticket.
Fixes found along the way (e.g. a secret leaking into logs) get their own ticket too.

**Why:** Giga, 2026-11-16, while porting a service: "if something inside [the ticket]
concerns global issues, like logging … I better leave it out; if worth fixing, create
another ticket, otherwise leave it out completely." The playbook's "switch to the shared
JSON logger" step would have silently broken ~45 dashboard widgets and a log-parsing rule
that read the old text format (found by listing the monitoring config's queries, aggregate
API only). Alerts were metric-based and safe. Same session, a token-in-logs leak became a
separate ticket draft instead of a drive-by fix.

**How to apply:** before a step that changes observable output, query what reads it
(dashboard and alert queries, parsing rules, consumers) and count the dependents. If any,
recommend splitting; record the scope rule in the ticket's memory note and the gate
skill so later steps apply it without asking. The local lint/config exception it forces
(e.g. allowing console logging for one service) is part of the move, removed by the
follow-up ticket.

**Signal:** a migration step named "switch to the shared X", a log/format/auth change, or a
bug found mid-port that other services or monitoring would notice.

**Next time:** list the consumers first, then offer "keep in ticket / own ticket / drop",
with the own-ticket option as the default.
