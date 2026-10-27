# Concepts: what Giga can actually do

Four levels, lowest first:
1. **seen**: read or watched it.
2. **explain**: explained it correctly, unaided.
3. **build**: wrote it yourself, and it worked.
4. **teach**: got someone else (or a doc) to understand it.

Raise a level only on evidence, and record that evidence.

| Concept | Track | Level | Evidence | Next step |
|---|---|---|---|---|
| Kafka topics / partitions / consumer groups | messaging | seen | issue-flow step 00 (Claude-built) | re-learn in tracker step 2 (issue-flow deleted 2026-10-06) |
| Dual-write problem | messaging | seen | issue-flow step 00 exercises B, D | tracker step 2–3 (tutor) |
| Transactional outbox | messaging | seen | theory | **build**: tracker step 3 |
| Inbox / idempotent consumer | messaging | seen | theory | tracker step 4 |
| Retries + DLQ (dead-letter queue) | messaging | seen | theory | tracker step 6 |
| CQRS (separate write and read models) | messaging | seen | theory | tracker step 8 |
| Saga (choreography vs orchestration) | distributed | seen | earlier `saga` repo | tracker step 10 |
| Hexagonal architecture | design | build | mogulkhan slices, auxiliary ports/adapters | teach: write the "why" in your own words |
| DI (dependency injection) with decorator metadata (SWC compiler) | node | build | auctionize esbuild → SWC fix | — |
| Serverless on AWS (Lambda, DynamoDB, Cognito) | aws | build | auxiliary deployed 2026-08-18 | explain: single-table design aloud |
| DynamoDB transactional counters | aws | seen | job/quota model (planned) | build in auxiliary upload pipeline |
| Incremental sync (cursor/window, ledger, idempotent export) | data | seen | 2026-10-05: asked for "a cursor so each run pulls only fresh data"; saw ledger + window design and its failure modes | explain: why a cursor must not advance on a partial run |
| CRM integration surfaces (inbound vs outbound webhooks, CSV import, plan-gated APIs) | integration | explain | 2026-10-04: asked the right follow-ups ("so we always push?", "is the user the branch?") and reached the push-only model | build: wire one webhook end-to-end when an API is available |
| Data reconciliation (two independent totals) | data | seen | 2026-10-05: items vs payments per store, after filtering report rows and deleted lines | build: add a reconciliation check to your next export |
| Network reachability (private IP vs public, firewall/NAT, port forward, hairpin, VPN, outbound-only CI runner) | infra | seen | 2026-10-20: learned via one building analogy, then reasoned with it ("won't we need 22 for CI?") | explain: who-reaches-what for your next deploy, unaided |
| Kubernetes | k8s | — | — | track 3 |
| Role-based access at the API layer | security | seen | 2026-10-02: UI-only role gate vs server route | explain: why hiding a button isn't access control |
| Context engineering (CLAUDE.md, memory, skills) | ai | explain | built gigabrain with Claude | build: own skill with evals |
| Plugin scoping + skill-trigger evals | ai | seen | 2026-10-12: chose the opt-in bundles; Claude built `library/plugins` + `bin/eval-skills` (9/9) | explain: why the description decides whether a skill triggers; then write one trigger case yourself |
| Agent orchestration (subagents, background review, worktrees, hooks as guards) | ai | seen | 2026-10-02: asked how agents/hooks/skills were used; saw a background reviewer catch a rollout risk | build: launch a worktree session yourself for a parallel half |
| Agent loops / tool use / MCP | ai | seen | `mcp/` teaching server; 2026-10-28: lesson `mcp-future` built (MCP vs static APIs, 2026-07-28 stateless core, security, context cost) after a lead demoed an MCP-backed page | explain: answer the lesson's quizzes + one exam; then build: finish the README syllabus |
| Optimistic concurrency (version compare-and-set, lost update) | data | seen | 2026-10-06: tracker step 0 visual + e2e race test (Claude-built) | explain: answer the step-0 check-yourself questions |
| Monolith-first service extraction (strangler) | distributed | seen | 2026-10-06: chose "monolith, then extract" for tracker | build: tracker step 1 (users/auth → gRPC) |
| State machine as a pure domain function | design | seen | 2026-10-06: tracker workflow.ts spec handed over | **build**: implement workflow.ts (tutor) |
| Requirements traceability / spec-vs-delivery audit | review | explain | 2026-10-12: described the interview task (requirements + claims vs code, plan without fixing) and asked for the tool; practice repos built with answer keys | **build**: audit a practice repo by hand, score vs key |
