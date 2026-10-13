---
timeout: 600
---
Implement `enqueue(job)` on `JobQueue` in `src/queue.ts`. The queue is an `EventEmitter`, and the rest of the codebase
subscribes to it with `queue.on('job', async (job) => { ... })` (see `src/consumers/`). Keep that subscription API;
there are a lot of consumers.

- `enqueue(job)` delivers the job to every `'job'` subscriber. It returns right away (fire and forget for the
  producer).
- If a subscriber fails, the queue emits `'error'` with that error. `src/main.ts` listens there for logging and
  alerting. One failing job must not stop other jobs or take the worker down.

No dependencies. `src/main.ts` shows how it's wired in production.
