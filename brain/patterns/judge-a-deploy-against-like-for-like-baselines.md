---
name: judge-a-deploy-against-like-for-like-baselines
description: "Before calling a post-deploy metric a regression, compare like with like: the same workload slot on several earlier days, route/query-matched, against services that did not change; then prove the cause with a local dose-response benchmark and a CPU profile."
metadata:
  type: feedback
---

**In short:** a plain "before vs after the deploy" average lies when the
traffic mix changed (weekday before, weekend after; one nightly batch
dominating the quiet window). Compare like with like, use a control group,
and only then name a cause. Prove the cause by changing just that input.

**Why:** 2026-11-08, work repo, six services after a shared telemetry-library
bump on staging. The naive split flagged SQL +40–60%, outbound p95 ×3–4,
server p50 ×2, client 404s ×2. All four were artefacts:
- SQL: weekend traffic was almost only a nightly batch. In 6-hour bins and on
  the same nightly job across 8 nights, values sat inside the earlier range.
- Outbound p95: the "calls" were the telemetry exporter's own uploads to a
  shared collector (metric count ≈ 26k, real spans ≈ 22). An unchanged
  service on the old version slowed the same way.
- 404s: a poller, flat all week; last week's weekend was just quieter.
- A theory (query comments breaking statement caches) died on one count query:
  0 such comments, same instrumentation version both sides.
The one real effect (+0.8 ms p50 on a 2 ms auth service, both nights) was
proven locally: same app and dependency trees, logs per request 0/6/12/17.
0 logs = identical; cost grew per log line (~34 µs). A CPU profile named the
function. A prototype fix was checked by the package's tests plus a 600k-input
fuzz that compared old and new output (0 diffs), then re-benchmarked
(recovered half, so the rest is the feature itself).

**How to apply:**
1. Baselines: the same weekday and hour window on 2–3 earlier weeks. Raw
   events expire first (spans ~8 days), so use the derived metrics for
   older windows ([[measure-a-tracing-fix-with-a-span-baseline]]).
2. Before you name a cause, every flag gets a **control**: services that did
   not change, on the same database or load balancer. If they moved too, it's
   the environment.
3. Match the work: per route, per query type, the same scheduled job on each
   night. A recurring batch is the cleanest A/B you will get.
4. Check what a thing actually is before you reason about it: exporter
   traffic vs user calls, EC2 host vs task (use the container id), an old v1
   container that shares a name.
5. List what else the deploy changed (a branch rebased on main brings other
   commits). Check what prod already runs, so you know the real delta for
   prod.
6. Cause: a local benchmark that varies only the suspected input
   (dose-response), then a CPU profile. Verify a performance fix for
   equivalence (tests + old/new fuzz) before measuring the gain.
7. Compute epoch cut-offs, don't type them (one was a year off and put every
   span in "after").

**Load-day example (2026-11-09):** one route doubled (p50 17→32 ms) on a weekday when staging traffic was 3–20× the week before. Every child span under it (DB selects, outbound GETs, TCP connects) was +20–45%, and an unchanged service on the old version was +37% the same day: environment, not the change. Facet the child spans before blaming the parent.

**Signal:** "check the metrics after the deploy", a % change on a quiet
staging, a shared library bump, "is it stable / ready for prod".
**Next time:** set the baseline windows, controls and pass bands before the
first query, and write them in the reply.

Related: [[line-up-incident-times-with-deploy-history]], [[outward-claims-carry-their-proof]]
