# Tracks

Track 0 (`ai-craft/`) runs **alongside** all of these. Every lab session is
also practice in working with Claude. The order matters: each track builds on
the one before.

| # | Track | Lab | Ideas that will outlive today's tools |
|---|---|---|---|
| 1 | Messaging & distributed data | **issue-flow** (steps 01–08) | the log, delivery guarantees, idempotency, ordering, sagas |
| 2 | Scaling & system design | extend issue-flow: more partitions, consumer scale-out, load tests (k6) | partitioning, replication, backpressure, consistency models |
| 3 | Kubernetes | issue-flow on kind → HPA on consumer lag (KEDA) | desired state, control loops, scheduling, probes |
| 4 | AWS | issue-flow mapped to MSK / SQS / EKS; auxiliary for serverless | managed vs self-run, IAM boundaries, cost as a design input |
| 5 | AI engineering | `mcp/` server + a small agent with evals | context, tools, RAG, evals, agent loops |

Tools change (KafkaJS died in 2023, per your own notes). The concepts in the
right-hand column don't. When a lab forces a tool choice, record the *why* in
`brain/patterns/` so the reasoning is reusable after the tool is gone.

Each track is "done" when its concepts in `me/concepts.md` reach **build**
and at least one reaches **teach**.
