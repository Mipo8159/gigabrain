---
timeout: 600
heldout: true
---
Report regeneration (`ReportWorker.regenerate` in `src/reports.ts`) runs on 4 worker instances, triggered by data
events. The same report is often triggered on two workers at once, and they overwrite each other with renders built
from different data snapshots, so customers sometimes see an older report after a newer one.

Make it so only one worker regenerates a given report at a time:

- Use the platform's `LeaseLock` (`src/lease-lock.ts`). It's the client for our coordination service, so don't
  change it. The lease TTL is `ttlMs` (default 30 s); the platform client has no renew call yet.
- If another worker holds the report's lock, skip: `regenerate` returns `false`. It returns `true` when this worker
  regenerated and stored the report.
- Rendering usually takes a few seconds, but the big customers' reports can take minutes, and the workers are on
  shared nodes that sometimes stall.
- Reports live in `KvStore` (`src/kv.ts`). That file is the in-memory stand-in we use in tests; production is
  DynamoDB behind the same API, so only use what the API offers.

Keep the `ReportWorker` constructor options and `getReport(db, reportId)` working as they are now. No new
dependencies. Add a test of your own if you like (`node --test`).
