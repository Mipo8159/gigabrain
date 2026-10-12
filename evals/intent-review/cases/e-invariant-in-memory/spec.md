# CP-160 Bulk approve

Admins review uploads in batches after a creator challenge and want one click.

- AC1 `POST /admin/content/approve-bulk` with body `{ ids: string[] }` (1 to 100 ids, else 400).
- AC2 Each id is approved independently: one failure doesn't stop the rest.
- AC3 Response: `{ approved: string[], failed: { id, reason }[] }`.
