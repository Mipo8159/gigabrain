---
name: distributed-systems
description: Rules for resilience code between services. Load when writing or reviewing a circuit breaker, retry or backoff logic, timeouts and deadlines, idempotency keys, outbox relays, sagas, or distributed locks.
---

# Distributed systems: rules Claude was measured to miss

Opus already handles deadlines, Retry-After, idempotency keys, outbox cursors,
fencing tokens, advisory-lock leaders and saga compensation correctly (see
`gigabrain/evals/knowledge/distributed-systems/NOTES.md`). This skill holds only
what the evals showed it getting wrong. Keep it that way: a rule enters only with
a failing-then-passing eval behind it.

## Rules

- **When** a circuit breaker, retry policy or health metric decides what counts as
  a failure → **count only errors that say the dependency is unhealthy**: timeouts,
  network errors, 5xx, 408 and 429. A 4xx caused by the caller's input (400, 404,
  409, 422) passes through to the caller unchanged and resets nothing. Retrying it
  is pointless, and it must not move the breaker toward open.
  **Because** user-supplied bad input (unknown IDs, malformed requests) is routine
  traffic. If it counts, a burst of bad requests opens the circuit and takes the
  healthy dependency away from every user. That is the outage the breaker exists
  to prevent. Look for a status field on the repo's error type (e.g. `err.status`)
  and classify on it. Make the classifier an option if the API allows it.
