---
name: reconcile-against-an-independent-total
description: "Prove an extracted business number (revenue, counts) against an independent source in the same system (items vs payments), not against a derived copy. Derived reporting copies and 'status' rows silently multiply or pollute totals."
metadata:
  type: feedback
---

**Rule:** before trusting an export's money or counts, reconcile it per unit (store, day) against a
**different table that records the same fact independently**, e.g. line items vs payments received.
Don't reconcile against a reporting copy or against the same query re-run; that's circular.

**Why:** 2026-10-05, POS export from an ERP:
- The vendor's BI copy had the right receipt count but 1.65× the lines and revenue, apparently join-multiplied. It was unusable as ground truth.
- Deleted lines carried junk quantities: billions in value from barcodes typed into the quantity field.
- Register X/Z summary reports were stored as receipt types with payment rows, so payments looked exactly 2× items.

Once each of those was filtered, items equalled payments to the cent for every store. The filters
then went into the exporter as calibrated, commented constants.

**How to apply:**
1. Find two independent records of one fact: items and payments, stock in and out, ledger debit and credit.
2. Group both by the natural unit (store × day). Every unit should have diff = 0; "close overall" isn't proof.
3. When a diff appears, break it down by type/status codes before guessing. An exact 2× ratio means duplicated or summary rows.
4. Write the verified rule into the code and the project memory, with the date and the evidence.

**Signal:** "revenue", "totals", "sales per X", an export or dashboard of money, a vendor-made reporting DB.
**Next time:** name the independent counterpart in the done-criteria ("store-day revenue = payments, per store, to the cent").
