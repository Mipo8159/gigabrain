---
name: scope-comes-from-one-source
description: "Tenant/region scope must be read from one source (the user record OR the request header) across every entry point that feeds a cross-entity invariant; mixing them breaks the invariant only for some clients. Trace the whole chain before building — most of a 'make it scoped' request is often already there."
metadata:
  type: project
---

When rows are scoped (region, tenant, workspace), every endpoint that creates a row
taking part in a cross-entity check must take the scope from the **same source**.
A decorator that prefers a request header and falls back to the user record
looks equivalent in testing, because the two agree in most clients.

**Evidence:** 2026-10-05, a request to make user uploads "region bound end to end".
tracing it showed submit, the reviewer list, and the reel/lesson created on approve
were already scoped. They all used the user record. The real bug was one sibling
endpoint (creator creates their channel) that used a header-first helper. If a
client's header differed from the user's region, the channel landed in the header's
region, and every later lesson submission failed the approve-time invariant
"course.region == submission.region" with a 400. It was a 3-line fix, proven by
creating the channel with a mismatching header and checking the stored region.
The admin by-id endpoints (get/approve/reject) also accepted any id under any region.
They were scoped too, as consistency, not security: no admin↔region mapping
existed, so a header check can't be an authorization boundary.

**How to apply:**
- Before building, list every entry point that writes or reads the scoped entity
  and the source of its scope (header, user record, parent row). Show it as a table.
  Report what already holds; build only the gap.
- Pick the source that the read path uses (here, the feed read the user record).
  Grep for the header-first helper in sibling controllers of the same feature.
- For a by-id scope check, return 404, not 403, and say whether it is security
  (needs a principal↔scope mapping) or consistency only.
- Prove it with a mismatching header: create via the API with header ≠ user scope,
  then query the stored scope.

**Signal:** "make X region/tenant scoped", "should be created within the region",
or a scope-decorator that falls back between sources.
**Next time:** entry-point × scope-source table first, then the mismatching-header proof.
