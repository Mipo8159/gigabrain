# Code practices: what the runs taught

## Baseline 2026-10-12 (vanilla Opus 5.5, write mode, 2 runs per case, results/20261012-235102)

Effectively **16 of 16**. Vanilla Claude handled these unprompted, from an ordinary ticket:
cursor pagination with a unique tie-break, DST-safe scheduling with `Intl`, path traversal
(separator, NUL, double encoding), SSRF (IPv6-mapped, DNS to private IPs, redirect hops),
LIKE wildcard escaping and an ORDER BY allowlist, currency minor units (JPY/KWD) with shares
that sum to the total, and HMAC over raw bytes with a length-safe compare.

payments-idempotency-key first scored 0/2. On inspection, both runs failed one assertion
only: "a processor failure must not be stored". The ticket said a retry should get "the same
answer it would have got the first time", and replaying the stored 502 is Stripe's documented
behaviour. That was ambiguous wording, not a knowledge gap, so the assertion was removed.
Lesson for the evals: **audit every failure for test fairness before it becomes skill content.**
