# Concepts: what Giga can actually do

Levels: **seen** (read or watched it) → **explain** (explained it unaided,
correctly) → **build** (wrote it yourself, it worked) → **teach** (made someone
else, or a doc, get it). Raise a level only on evidence, and record the evidence.

| Concept | Track | Level | Evidence | Next step |
|---|---|---|---|---|
| Kafka topics / partitions / consumer groups | messaging | seen | issue-flow step 00 (Claude-built) | re-learn in tracker step 2 (issue-flow deleted 2026-10-06) |
| Dual-write problem | messaging | seen | issue-flow step 00 exercises B, D | tracker step 2–3 (tutor) |
| Transactional outbox | messaging | seen | theory | **build**: tracker step 3 |
| Inbox / idempotent consumer | messaging | seen | theory | tracker step 4 |
| Retries + DLQ | messaging | seen | theory | tracker step 6 |
| CQRS | messaging | seen | theory | tracker step 8 |
| Saga (choreography vs orchestration) | distributed | seen | earlier `saga` repo | tracker step 10 |
| Hexagonal architecture | design | build | mogulkhan slices, auxiliary ports/adapters | teach: write the "why" in your own words |
| DI with decorator metadata (SWC) | node | build | auctionize esbuild → SWC fix | — |
| Serverless on AWS (Lambda, DynamoDB, Cognito) | aws | build | auxiliary deployed 2026-08-18 | explain: single-table design aloud |
| DynamoDB transactional counters | aws | seen | job/quota model (planned) | build in auxiliary upload pipeline |
| Incremental sync (cursor/window, ledger, idempotent export) | data | seen | 2026-10-05: asked for "a cursor so each run pulls only fresh data"; saw ledger + window design and its failure modes | explain: why a cursor must not advance on a partial run |
| CRM integration surfaces (inbound vs outbound webhooks, CSV import, plan-gated APIs) | integration | explain | 2026-10-04: asked the right follow-ups ("so we always push?", "is the user the branch?") and reached the push-only model | build: wire one webhook end-to-end when an API is available |
| Data reconciliation (two independent totals) | data | seen | 2026-10-05: items vs payments per store, after filtering report rows and deleted lines | build: add a reconciliation check to your next export |
| Kubernetes | k8s | — | — | track 3 |
| Role-based access at the API layer | security | seen | 2026-10-02: UI-only role gate vs server route | explain: why hiding a button isn't access control |
| Context engineering (CLAUDE.md, memory, skills) | ai | explain | built gigaforge with Claude | build: own skill with evals |
| Agent orchestration (subagents, background review, worktrees, hooks as guards) | ai | seen | 2026-10-02: asked how agents/hooks/skills were used; saw a background reviewer catch a rollout risk | build: launch a worktree session yourself for a parallel half |
| Agent loops / tool use / MCP | ai | seen | `mcp/` teaching server | build: finish the README syllabus |
| Optimistic concurrency (version compare-and-set, lost update) | data | seen | 2026-10-06: tracker step 0 visual + e2e race test (Claude-built) | explain: answer the step-0 check-yourself questions |
| Monolith-first service extraction (strangler) | distributed | seen | 2026-10-06: chose "monolith, then extract" for tracker | build: tracker step 1 (users/auth → gRPC) |
| State machine as a pure domain function | design | seen | 2026-10-06: tracker workflow.ts spec handed over | **build**: implement workflow.ts (tutor) |
