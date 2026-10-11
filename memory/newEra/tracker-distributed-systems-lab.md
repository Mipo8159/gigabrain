---
name: tracker-distributed-systems-lab
description: "newEra/tracker — Giga's Jira-like distributed-systems lab (replaced issue-flow 2026-10-06): monolith split one pattern per step, hybrid tutor mode, animated visual per step"
metadata:
  type: project
---

`newEra/tracker` (started 2026-10-06) replaces issue-flow, which Giga deleted the same day. Goal: production-like understanding of Kafka, outbox/inbox, DLQ, sagas, CQRS, gRPC, Elasticsearch, ClickHouse, load balancers. Roadmap (13 steps) in its README; conventions in its CLAUDE.md.

**Why:** comprehension is the deliverable, and Giga had written 0% of issue-flow. Decisions Giga made (2026-10-06, one question batch): **hybrid** (Claude scaffolds infra/tests/docs/visual; Giga writes each step's pattern core, marked `YOUR CODE`), **monolith first, then extract**, **Elasticsearch**, repo name tracker.

**How to apply:**
- One step per session. Every step ships: a chaos switch, a failing spec for Giga's core, a step doc, and `docs/visual/step-NN.html`, published as a claude.ai artifact (step 0: https://claude.ai/artifact/5tvPunMVe2FQyg9d2HaUwV). Giga wants the visual to be simple and animated, with buttons per scenario and one-line commands, and rejected long instruction pages. Headless-test the page (puppeteer in ~/.npm/_npx/23232c69e5d221f3) and click every button.
- Prove the scaffold by swapping in a reference implementation from the scratchpad, running the suite, then restoring the stub. Never leave the solution in src/.
- Kill processes by port (`ss -ltnp`), never `pkill -f <pattern>`: it matches its own shell (exit 144, hit again 2026-10-06).
- Run the reviewer on every step. On step 0 it found an admin able to demote the last admin, deactivated users keeping access, a 500 on an int overflow, and query params with PII in the logs. All fixed, with e2e cases.

## Where we stopped (2026-10-06)
- Step 0 built: users/auth (JWT + scrypt N=2^17), projects + ProjectAccess, issues (atomic per-project numbers, compare-and-set `version`), audit in the same tx, DbErrorFilter, env validation, explicit `db:migrate`. Postgres 18 on :5440.
- Proof: with the stub, only the 6 workflow e2e tests are red (22 pass). With a reference impl, 28/28 e2e and 24/24 unit, 3 runs in a row.
- **Giga's homework:** implement `src/issues/domain/workflow.ts`, click through the step-0 visual, answer its 5 questions. Giga makes the first commit (git init done, nothing committed).
- **Next session:** "step 1" = extract users/auth into its own service. ProjectAccess becomes a gRPC call (proto, deadlines, fail-closed, maybe a short cache). Convert to a Nest monorepo (`nest g app users`). Kafka lessons from issue-flow are in tracker/CLAUDE.md Gotchas, ready for step 2.
