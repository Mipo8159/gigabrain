# Stock adjustment files

Warehouses export these from Excel ("CSV UTF-8") or from their WMS. Sizes go from a few rows to
several GB (full re-counts of the big warehouses, tens of millions of rows).

- RFC 4180 CSV, comma separated, UTF-8. Line endings are CRLF (Excel) or LF (WMS).
- First line is the header: `sku,name,delta` (columns may come in any order).
- Fields may be quoted: `"Bolt, M8 ""heavy"""`. Product names may contain commas, quotes, line breaks
  and any Unicode (French, German, Japanese and Georgian names are common).
- `delta` is a signed integer: how much to add to (or remove from) the SKU's stock.
- `name` may be empty: keep the current name (for a new SKU, use the SKU as its name).
- A row with an empty `sku` or a `delta` that is not an integer is invalid: skip it and record it in
  `import_errors` (record number counted from 1 = first data row, and a reason).
- An SKU we have never seen is created with stock = delta.
