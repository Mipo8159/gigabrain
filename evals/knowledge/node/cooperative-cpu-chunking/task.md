---
timeout: 600
---
`scoreAll(records)` in `src/scoring.ts` runs inside our API process, called from the `/batches/:id/score` handler.
Batches have grown to 50k+ records, and while a batch is scored the whole process freezes for seconds: other requests
stall and the load balancer's health checks time out, so the pod gets restarted.

Make `scoreAll` stop freezing the process. Requirements:

- Same signature: `scoreAll(records: Rec[]): Promise<number[]>`, same results in the same order.
- While a batch is being scored, the rest of the process (other requests, timers) should never stall for more than
  ~50 ms at a time.
- `scoreRecord` (src/model.ts) wraps a vendor model that holds native state; it must stay in this process (no worker
  threads or child processes). Don't change `src/model.ts`.
