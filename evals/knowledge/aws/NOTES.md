# AWS: what the runs taught

## Baseline 2026-10-12 (vanilla Opus 5.5, write mode, 2 runs per case)

**16 of 16.** This includes the SDK changes from 2025 that the brief expected to catch
a model writing from memory: `throwOnRequestTimeout` (smithy 4.4.0), the CRC32
checksum in presigned PUT URLs (3.729.0), DynamoDB integers above 2^53 as `bigint`,
BatchWrite `UnprocessedItems`, `Limit` applied before the filter, FIFO partial-batch
failures, PutEvents per-entry errors, and conditional-write idempotency. None of this
belongs in a skill for Opus.
