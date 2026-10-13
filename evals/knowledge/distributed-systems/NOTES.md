# Distributed systems: what the runs taught

## Baseline 2026-10-13 (vanilla Opus 5.5, 2 runs per case, results/20261013-003227)
14 of 16. Base already handles deadlines, Retry-After HTTP-dates, client idempotency keys,
outbox late commits, advisory-lock leaders, fencing tokens and saga compensation.

## Real gap: what counts as a failure
pricing-circuit-breaker: base 1 of 5 across two batches. It counted caller 4xx (404/422 from user
input) as dependency failures, so bad input opens the circuit. The case is fair: the repo's
HttpError has `.status`, and the ticket says 4xx are frequent.
Skill rule added (global/skills/distributed-systems): with the skill 3/3, and it fired 3/3
(results/20261013-004649). Regression check: see below.

## Regression check (2026-10-13)
Skill arm over all 8 cases: 7/8, the miss was leader-election (a 197 s hang). Recheck of that
case: base 2/2, skill 2/2 (skill fired 2/2). Noise, not harm. The skill stays.
