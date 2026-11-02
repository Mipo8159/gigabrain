---
name: pii-api-data-profile-then-export
description: "Checking an API that returns customer data: profile it by structure and aggregates without printing values, break every mismatch down by value before reporting it, and export to xlsx with every site value forced to text (zero formula cells), verified by opening it in a real office app."
metadata:
  type: feedback
---

**Rule:** personal data from an API is checked by shape and counts, not by
reading rows, and goes to a spreadsheet only as inert text.

**Why:** 2026-11-02, a client API returned users, orders and wishlists (names,
emails, phones, addresses). Streaming the responses over ssh straight into a
local analyser (no file on either side) gave field types, null rates, distinct
counts, date ranges and cross-references without one value in the transcript.
- "688 orders point to missing users" looked like data loss. Broken down by
  value it was 687 rows with `user_id = 0` (guest checkout placeholder) plus 1
  real orphan. The first number would have been a false alarm to the client.
- An xlsx export then needed a library that wasn't installed, and the install
  was denied. xlsx is zipped XML, so the standard library wrote it with
  `t="inlineStr"` cells; parsing it back counted 0 `<f>` formula cells, and
  LibreOffice headless opened all three files with matching row counts.
- A `_ge` (Georgian) title column held no Georgian. Other columns kept Georgian
  through the same code, which proved the source sent Latin text, not an export bug.

**How to apply:**
1. Profile per field: present/empty/distinct/types, min–max for dates, duplicate
   ids, foreign-key misses. Print counts only.
2. Before reporting any mismatch, `Counter` the offending values; a single
   sentinel (0, -1, "") usually explains most of it.
3. Spreadsheet export of untrusted text: force string type (openpyxl:
   `cell.data_type = "s"`; raw XML: `inlineStr`), strip XML-illegal control
   chars, numbers only for known numeric columns. Verify 0 formula cells, then
   open with `soffice --headless --convert-to csv` and compare row counts.
4. Suspect encoding? Compare against a column that went through the same path.
5. Output folder mode 700, files 600, outside any git repo; say in the reply
   that it holds personal data and is a dated snapshot.

**Signal:** an endpoint named users/orders/customers, "make Excel files of this data", "check the integrity of the data".
**Next time:** profile with aggregates first, explain each mismatch by value, then export as text-only cells and prove it opens.
Related: [[probe-a-locked-api-by-its-error-order]], [[secrets-land-in-readme]].
