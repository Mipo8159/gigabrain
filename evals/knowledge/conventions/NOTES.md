# Repo conventions: what the runs taught

## Base vs brain 2026-10-13 (Opus 5.5, 2 runs per case, results/20261013-034726)

| arm | result |
|---|---|
| base (vanilla) | 16 of 16 |
| brain (Giga's real setup: CORE.md + global skills) | 16 of 16 |

Each fixture had 10–15 files and a convention used by ≥2 neighbour modules plus a docs note
(migration runner's transaction wrapper, injected clock, `withTenant` for RLS, `Money` rounding,
validated config, PII-redacting logger, `AppError` mapping, transactional outbox). Vanilla
Claude found and followed every one. The single earlier slip (CREATE INDEX CONCURRENTLY in a
transactional runner, postgres baseline) did not recur here: a one-off, not a pattern.
**The brain neither helped nor hurt on conventions.** It cost more per run (larger context).
