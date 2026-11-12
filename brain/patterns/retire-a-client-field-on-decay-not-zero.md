---
name: retire-a-client-field-on-decay-not-zero
description: "Removing an API field that old client bundles still use: a 'zero hits for N hours' gate may never close (tabs left open for weeks); gate on the decay curve plus a fixed cutoff, and count the field's input uses too, since read-metrics can't see them."
metadata:
  type: feedback
---

**In short:** after the clients stop using a field, its stub's traffic decays
to a long tail of tabs nobody reloads. Waiting for zero waits forever. Decide
on the curve, pick a quiet cutoff, and accept a one-time reload.

**Why:** 2026-11-11/12, work repo. Two deprecated GraphQL stub fields were
kept for old frontend bundles, with a reviewer's gate of "48h of zero
selections". The share of page loads that still selected them fell
3% → 1.6% → 0.2% in two days and then stuck at ~10 hits/hour from a few
long-lived tabs. A monitor showed zero for 90 minutes, which read as "gate
nearly met"; the hits came back after it stopped. Giga: "this could go
indefinitely, someone might keep using the same tab for ages". Merged on
the trend instead: 30-min watch showed 0 5xx and one burst of 10 rejected
requests from one old tab, falling to ~2/hour within hours.
Second gap found in review, not by the gate: the old bundle also *sent* the
flag inside a mutation input. The gate counted field-resolver spans (reads
only), so input use was invisible; removing the input field fails those
saves with a validation error.

**How to apply:**
- Measure the stub's share of the parent operation per window (hits /
  page-load operation), not raw hits; a falling share = stale tabs, a flat or
  rising share = a bundle is still being served (stop, find it).
- Set the gate as "share below X% and falling for 24h, then merge at a named
  quiet hour", not "N hours of zero". Say the cost: a handful of users reload once.
- Inventory inputs as well as outputs: grep the old bundle (git history of the
  frontend) for the field inside mutation variables; read-side metrics won't
  see it.
- Re-measure the gate right before merging (see
  [[merge-can-be-a-deploy-pin-the-abort-line-first]]).
- After deploy, watch rejected requests (400s with no operation name) vs the
  same window last week; expect a small burst that decays.

**Signal:** a deprecation stub, "kept for older bundles/clients", a reviewer's
"wait until zero" condition, or a gate that keeps resetting.

**Next time:** plot the share per 6h first and propose a dated cutoff with
the decay numbers, instead of a zero gate.
