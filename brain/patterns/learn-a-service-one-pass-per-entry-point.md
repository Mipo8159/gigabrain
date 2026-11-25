---
name: learn-a-service-one-pass-per-entry-point
description: "When learning, teaching or migrating a service, read it once per entry point (route, schedule, queue): who may call it, what credential it attaches outbound, and whether the destination comes from config or the request. A flow-level read misses holes that this pass finds in minutes."
metadata:
  type: feedback
---

**Rule:** after the flow-level picture (who calls whom), do a second pass that
lists every entry point (each route in the API definition, each schedule, each
queue consumer) and answers three questions per row:
1. Who is allowed in? Check both layers: the gateway definition *and* the handler.
2. What credential does it attach when it calls out?
3. Where does that call go: a configured address, or an address taken from the request?

**Why:** 2026-11-25, a set of lesson videos had 64 file:line-checked claims about a
service's flow and still missed that one callback route checked no caller at either
layer and sent the service's own token to a URL taken from the request body.
The per-entry-point table found it within minutes, along with a missing dead-letter
queue and a queue hide time shorter than the consumer's timeout.

**How to apply:** make the table part of the lesson or migration plan (one row per
entry point, cites for each cell). Any row with "no check" plus "address from the
request" is a security finding: tell the user right away and raise it as its own
ticket, not inside the migration.

**Signal:** "I need an in-depth understanding of this service", a migration
kickoff, or a code tour of a service with several routes or handlers.
**Next time:** build the entry-point table before writing narration or a plan.
Related: [[outward-claims-carry-their-proof]], [[narrated-explainer-video-from-html-scenes]].
