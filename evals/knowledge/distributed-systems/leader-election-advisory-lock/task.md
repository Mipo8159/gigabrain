---
timeout: 900
services: [postgres]
deps: distributed-systems
---
The scheduler (`src/scheduler.ts`) runs inside our API service, which runs on 3 instances, so every nightly job
currently runs 3 times. We want exactly one instance to run jobs at a time, and we don't want new infrastructure,
so please implement `LeaderElector` in `src/leader.ts` on top of a Postgres advisory lock.

- `campaign()`: try to become leader without blocking; resolves `true` if this instance is (now) the leader.
- `isLeader()`: whether this instance is currently the leader.
- `resign()`: stop being leader so another instance can take over (used on deploys and shutdown).
- If leadership is lost without `resign()` (DB connection dies, failover...), emit `'leadershipLost'` so the
  scheduler stops running jobs right away. It will call `campaign()` again on its next tick.
- The constructor gets the app's shared `pg.Pool` (`src/db.ts`), which the rest of the service uses concurrently
  for its normal queries, and the lock key.

Keep the class shape in the stub. `DATABASE_URL` points at a Postgres 17 database. No new dependencies. Add a test
of your own if you like (`node --test`).
