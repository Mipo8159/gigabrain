---
name: reset-must-clear-every-side-that-reasserts-state
description: When a client re-sends its own position on start (a self-healing baseline), a server-only reset is undone within one request. A "start over" must clear every side that re-asserts state, server first, with rollback of the local half if it fails partway.
metadata:
  type: feedback
---

**In short:** before building a "reset", list every place that *re-asserts* the state, not just where it is stored.

Sync protocols are often made robust by having the client tell the server "I already have up to X" on every start
(covers a lost confirmation, a changed client identity, an old install). That same robustness defeats a server-side
reset: the next start sends X back and the server is where it was.

**Why:** 2026-11-16 (work repo, per-client download checkpoints): the ask was "notify the server to prune my IP".
Reading the client's start-up path before planning showed it re-sends its newest locally listed item *and* the
manifests inside each output folder, so a server-only DELETE would have been a no-op. The design became: server
forgets, then the client moves its list and folders aside, then a normal first download. The background reviewer
then found two more holes no test covered: (1) a move failing halfway (a file open in Excel on Windows) followed by a
plain run re-seeded the server and hid the already-moved, unimported folders; (2) the reset ran before a 30-minute
pull, so another client sharing the identity could re-seed it in between.

**How to apply:**
- grep the client for everything it *sends* on start (baselines, watermarks, manifests), not only what it stores.
- Order: the remote reset first (if it fails, nothing local moved), then the local half.
- Local half all-or-nothing: on any failure put back what was already moved, so the state is "remote reset, local
  intact", which a plain run repairs. Test it with an injectable move function failing on the 2nd call.
- Do the reset as late as possible, right before the state is read, so a concurrent client has no time to re-seed it.

**Signal:** "reset / start over / prune / fresh start" for something that has a client-side cache, list or checkpoint.

**Next time:** the plan's first line names every re-asserting source; the proof is "-fresh, then the map shows exactly
one first entry", run against the real server.
