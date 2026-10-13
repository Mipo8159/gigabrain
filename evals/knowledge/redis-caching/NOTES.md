# Redis and caching: what the runs taught

## Baseline 2026-10-12/13 (vanilla Opus 5.5, write mode, 2 runs per case, results/20261013-002210)

Effectively **16 of 16**. Vanilla Claude handled these: TTL lost on MSET warm-up, a
cross-instance stampede lock, the delete-after-write race (lease or version),
the node-redis v6 SCAN string cursor, same-millisecond sliding-window members,
re-reading pending stream entries from `0` after a restart, and MULTI not rolling back.

job-lock first scored 0/2. Audit: both runs built a **renewing** lock (a watchdog
extends the TTL while fn runs), with a per-acquisition random token and Redis 8.4
`SET … IFEQ` / `DELEX … IFEQ` compare-and-set. That is correct and stronger than the
textbook answer. The hidden test simulated an overrun by waiting out the TTL, which a
renewing lock rightly prevents. The test now expires the key from outside, and the
base run's own code passes it. **A test failure, not a knowledge gap.**
