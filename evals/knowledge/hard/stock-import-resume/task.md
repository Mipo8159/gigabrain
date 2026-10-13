---
timeout: 1800
deps: hard
services: [postgres]
check: node --test --test-force-exit --test-reporter=spec 'hidden/**/*.test.*'
check_timeout: 300
---
Ticket INV-233: run stock adjustment imports

Upload and the import queue already work (`POST /imports`, `src/imports/worker.ts`), but the import itself is a
stub. Please implement `runImport(deps, importId, opts)` in `src/imports/run-import.ts` (keep the signature):

- Read the import's file from `deps.storage.open(fileKey)` and apply it to `products` as described in
  `docs/import-format.md` (add `delta` to the SKU's stock, create unknown SKUs, update the name when one is given,
  record invalid rows in `import_errors`).
- Apply the rows in batches of 1,000, one transaction per batch. After each batch, update `imports.rows_done` /
  `rows_failed` and call `opts.onProgress` (the UI shows a progress bar from it). Set the status to `running` when
  starting and to `done` (with `finished_at`) at the end, and resolve with the final `{ rowsDone, rowsFailed }`.
- The worker runs on spot nodes with a 512 MB memory limit, and the big files are several GB.
- Workers get killed mid-import (deploys, OOM, spot reclaims). After a crash the worker calls `runImport` again
  with the same id (status still `running`); it has to carry on from where the dead one stopped, and every row's
  delta must end up applied exactly once. Calling it for an import that is already `done` changes nothing.

No new dependencies (see README). `npm test` runs `node --test`; Postgres is at `DATABASE_URL`, and
`test/helpers.ts` gives you a pool and a local storage for tests.
