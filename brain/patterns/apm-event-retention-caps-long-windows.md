---
name: apm-event-retention-caps-long-windows
description: "In an APM tool, raw event queries (e.g. transaction events) silently return only the retained days (~8) even with 'SINCE 30 days ago'; identical counts for 7d and 30d mean you hit retention. Use the aggregated metric store for 30–90 day usage claims."
metadata:
  type: project
---

**In short:** a long time window on raw events doesn't error when it goes past
retention. It just returns fewer days. Aggregated metrics (timeslice/dimensional
metric data) are kept for months.

**Why:** 2026-10-26, a work repo. The "30 days" transaction-event query for a service
being removed and the "7 days" query showed the same counts (6 / 4 / 1). Rerun
against the metric store over 90 days, the totals were 141 / 45 / 77 / 23, with a 0
for every data-reading endpoint. That 90-day 0 became the evidence for "nobody uses
the feature" in the PRs. The 30-day event query would have overstated how much
history the claim covered.

**How to apply:**
- Usage claims of more than a week: query the metric store, e.g.
  `SELECT count(apm.service.transaction.duration) FROM Metric WHERE appId = … FACET transactionName SINCE 90 days ago`.
- Sanity check: run 7d and 30d. Equal numbers mean retention, not a quiet month.
- Billboard charts can hide small facets. Switch to a table before saying "only these".
- Log retention (often ~30 days) caps log-based checks the same way.

**Signal:** "N days of zero traffic", "nobody calls this", a deprecation gate.
**Next time:** write the gate query against metrics from the start, and state the
window that was actually covered.

Related: [[impact-review-traces-query-inputs]], [[measure-a-tracing-fix-with-a-span-baseline]].
