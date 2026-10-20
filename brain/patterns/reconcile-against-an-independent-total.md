---
name: reconcile-against-an-independent-total
description: "Prove an extracted business number (revenue, counts) against an independent source in the same system (items vs payments), not against a derived copy. Derived reporting copies and 'status' rows silently multiply or pollute totals."
metadata:
  type: feedback
---

**In short:** before trusting an export's money or counts, check it per unit (store, day)
against a **different table that records the same fact independently**, e.g.
line items vs payments received. A reporting copy or the same query re-run is
circular.

**Why:** 2026-10-05, POS export from an ERP:
- The vendor's BI (reporting) copy had the right receipt count but 1.65× the lines and revenue, apparently multiplied by a join. Unusable as ground truth.
- Deleted lines carried junk quantities: billions in value from barcodes typed into the quantity field.
- Register X/Z summary reports were stored as receipt types with payment rows, so payments looked exactly 2× items.

Once each of those was filtered, items equalled payments to the cent for every store. The filters
then went into the exporter as calibrated, commented constants.

**How to apply:**
1. Find two independent records of one fact: items and payments, stock in and out, ledger debit and credit.
2. Group both by the natural unit (store × day). Every unit should have diff = 0; "close overall" isn't proof.
3. When a diff appears, break it down by type/status codes before guessing. An exact 2× ratio means duplicated or summary rows.
4. Write the verified rule into the code and the project memory, with the date and the evidence.

**Also for inventories (2026-10-20):** a "which repos does my team need" list
built only from recent PR activity missed 8 live repos that the team-ownership
catalogue listed, and an earlier claim that two repos were "not cloned" was made
without checking the disk (both were there). Reconcile the activity list against
the ownership catalogue *and* `ls`, then report three buckets: present, missing-live,
deliberately skipped (archived, moved, dead), each with its reason.

**Signal:** "revenue", "totals", "sales per X", an export or dashboard of money, a vendor-made reporting DB.
**Next time:** for an inventory, union activity + catalogue and check disk before saying "missing". For money, name the counterpart in the done-criteria ("store-day revenue = payments, per store, to the cent").
