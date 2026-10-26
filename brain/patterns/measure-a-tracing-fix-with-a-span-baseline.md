---
name: measure-a-tracing-fix-with-a-span-baseline
description: "Prove a missing-span fix with the same span query before and after deploy. Network-level spans (tcp.connect to the host) prove the call happened while HTTP spans are absent. NRQL gotchas: backtick `url.full` (full is reserved), use Table not Billboard/JSON (they hide facets), and match the exact host, not a substring that also hits the service's own routes."
metadata:
  type: project
---

**In short:** before deploying a tracing fix, record the "before" in the same
tool, with the same query you'll use for the "after".

**Why:** 2026-10-26, work repo. An SDK upgrade moved a service's outgoing calls
from `http` to `fetch`, so the shared telemetry library stopped tracing them.
The staging baseline showed **869 `tcp.connect` spans to the vendor host per
day and 0 HTTP spans**. That proved the calls were happening but untraced, and
not missing. After the fix: 19 `POST …/chat.postMessage` client spans in 20
minutes. Three query mistakes each cost a round:
- `url.full` failed with a syntax error, because `full` is a reserved word.
- `LIKE '%vendor%'` also matched the service's own inbound routes
  (`/vendor-integration/...`), mixing server spans into the result.
- Billboard and JSON views hid the facet columns, so the span kind couldn't
  be read.

**How to apply:**
1. Find the exact `service.name` and the environment attribute with a `LIKE`
   facet query over 1 day.
2. Run the baseline on the exact host (`'%host.com%'`), faceting by `name`,
   `span.kind`, `http.url`, `` `url.full` ``, `server.address`,
   `net.peer.name`, in **Table** view. The old instrumentation fills
   `http.url` / `net.peer.name`; newer ones fill `url.full` /
   `server.address`. Query both.
3. A positive control in the same query (another host that *is* traced)
   shows the tracing pipeline itself works.
4. After deploying, trigger one known action and query from the deploy time
   (`SINCE '<yyyy-mm-dd hh:mm:ss +0000>'`, not `SINCE 13:45`). Background
   traffic inflates the count, so judge by the presence of the span type,
   not by an exact number.
5. Give the user one-line queries only, with no notes inside the code block.
   A pasted explanation line becomes query line 2 and errors.

**Signal:** "nothing is traced", a library swapped its HTTP client, or a fix
whose only visible effect is in an observability tool.
**Next time:** baseline query first, with the network spans as proof the
call happened; then the same query after the change.

Related: [[prerelease-a-shared-npm-package-to-test-it-in-one-consumer]], [[outward-claims-carry-their-proof]]
