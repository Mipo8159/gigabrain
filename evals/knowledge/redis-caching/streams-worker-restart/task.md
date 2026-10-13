---
timeout: 900
services: [redis]
deps: redis-caching
check: node --test --test-reporter=dot --test-timeout=10000 --test-force-exit 'hidden/**/*.test.*'
---
We're moving the thumbnail jobs from a Redis list to a Redis Stream with a consumer group, so several workers
can share the load and we stop losing jobs when a worker dies mid-job. Producers already `XADD` to the stream
`thumbs` (see `src/producer.ts`). Please implement the worker loop in `src/worker.ts`:

```ts
import type { RedisClientType } from 'redis';
export type Job = { id: string; fields: Record<string, string> };
export type WorkerOptions = {
  redis: RedisClientType;   // a dedicated connection for this worker
  stream: string;
  group: string;            // create it (and the stream) if it doesn't exist yet
  consumer: string;         // stable per worker
  handle: (job: Job) => Promise<void>;
  signal: AbortSignal;      // stop when aborted
};
export async function runWorker(opts: WorkerOptions): Promise<void>
```

A job counts as done once `handle` resolves. Workers run as a Kubernetes StatefulSet, so the consumer name is
the pod name (`thumbs-0`, `thumbs-1`, ...) and stays the same across restarts. Pods get OOM-killed now and then
in the middle of a job; after the pod comes back it should carry on with its work. Redis is 8.10, client is
node-redis `redis@6.3.0`. `REDIS_URL` points at a scratch Redis; `npm test` runs `node --test`.
