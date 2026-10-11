# library/candidates: sources under consideration

Repos found on 2026-10-05 while looking for "the next ECC": public AI knowledge
and learning material for AWS, message brokers, horizontal scaling, system
design, DDD, databases, Node.js and Kubernetes, ideally with visualisation and
hands-on project generation.

Nothing here is absorbed yet. A repo moves to `../sources.json` only through
`/absorb`, which reads the actual files. Stars measure popularity, not quality.

Stars, last push and licence come from the GitHub API on 2026-10-05.

## Tier A: absorb into `library/` (AI skills, permissive licence)

Progress (one source per run):

- [x] visual-explainer: absorbed 2026-10-06 @ `5846f5ae` (skill + references + 2 templates)
- [ ] wshobson/agents subset
- [ ] system-design-skills
- [ ] `arch-diagram` skill over mingrammer/diagrams (hand-written, `global/`)

| Repo | ★ | Last push | Licence | What to take | Skip |
|---|---|---|---|---|---|
| [wshobson/agents](https://github.com/wshobson/agents) | 40k | 2026-10-04 | MIT | `plugins/backend-development` (cqrs-implementation, event-store-design, saga-orchestration, microservices-patterns, projection-patterns, architecture-patterns, workflow-orchestration-patterns), `plugins/kubernetes-operations` (helm-chart-scaffolding, gitops-workflow, k8s-manifest-generator, k8s-security-policies), `plugins/cloud-infrastructure` (multi-cloud-architecture, istio-traffic-management, mtls-configuration, cost-optimization), `plugins/database-design` (postgresql-table-design) | the other ~90 plugins (SEO, trading, game dev, …); anything overlapping our `kubernetes-patterns`, `api-design`, `database-migrations` unless it is clearly better |
| [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) | 10k | 2026-10-02 | MIT | the skill that turns an explanation into a rich HTML page / slide deck with diagrams: the "visualise" half of the learning loop | — |
| [proyecto26/system-design-skills](https://github.com/proyecto26/system-design-skills) | 85 | 2026-06-02 | MIT | building-block system-design skills: requirements → sizing with numbers → components → trade-offs → failure stress test | small and young: triage hard, keep only the reasoning scaffold |
| [mingrammer/diagrams](https://github.com/mingrammer/diagrams) | 42k | 2026-10-04 | MIT | not a skill: a tool (diagrams as Python code, real AWS / k8s / Kafka icons). We write a thin `arch-diagram` skill that uses it | — |

## Tier B: clone and learn from (hands-on reference code, not absorbed)

Clone into `~/Desktop/workdir/sweeft/newEra/refs/` (outside gigabrain), run
locally, break things on purpose.

| Repo | ★ | Licence | Learn | Note |
|---|---|---|---|---|
| [Sairyss/domain-driven-hexagon](https://github.com/Sairyss/domain-driven-hexagon) | 15k | MIT | DDD + hexagonal in Node/TS: aggregates, value objects, domain events, repositories | same style as mogulkhan; last push 2024 |
| [GoogleCloudPlatform/microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo) | 21k | Apache-2.0 | 10 services on Kubernetes + Istio: deploy, scale, inject failures, observe | run on kind / minikube |
| [aws-samples/serverless-patterns](https://github.com/aws-samples/serverless-patterns) | 1.8k | MIT-0 (LICENSE file; API says NOASSERTION) | deployable SQS, SNS, EventBridge, Kinesis, Step Functions patterns | pick patterns that match auxiliary |
| [practicajs/practica](https://github.com/practicajs/practica) | 1.7k | MIT | production-ready Node starter: testing, logging, config, error handling | compare with mogulkhan |
| [oskardudycz/EventSourcing.NodeJS](https://github.com/oskardudycz/EventSourcing.NodeJS) | 0.5k | CC-BY-SA-4.0 | event sourcing in Node, step by step | pairs with issue-flow; share-alike, so never copy into gigabrain |
| [kgrzybek/modular-monolith-with-ddd](https://github.com/kgrzybek/modular-monolith-with-ddd) | 14k | MIT | the most complete DDD reference app (modules, integration events, outbox) | .NET: read for design, not syntax |
| [kelseyhightower/kubernetes-the-hard-way](https://github.com/kelseyhightower/kubernetes-the-hard-way) | 50k | Apache-2.0 | what k8s actually is underneath (certs, etcd, kubelet) | one weekend, optional |

## Tier C: read for visuals and breadth (knowledge only)

| Repo | ★ | Licence | Use |
|---|---|---|---|
| [ByteByteGoHq/system-design-101](https://github.com/ByteByteGoHq/system-design-101) | 90k | NOASSERTION | the most visual: one diagram per concept. Stale since 2025-04. Read, don't copy |
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | 373k | NOASSERTION | the classic map of scaling topics |
| [karanpratapsingh/system-design](https://github.com/karanpratapsingh/system-design) | 46k | NOASSERTION | a cleaner, course-shaped version of the primer |
| [binhnguyennus/awesome-scalability](https://github.com/binhnguyennus/awesome-scalability) | 75k | MIT | real company write-ups on scaling |
| [ddd-crew/ddd-starter-modelling-process](https://github.com/ddd-crew/ddd-starter-modelling-process) | 6k | CC-BY-SA-4.0 | the DDD modelling process (event storming → bounded contexts) |
| [goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices) | 106k | CC-BY-SA-4.0 | Node production checklist; a source for a reviewer checklist written in our own words |

## Studied, not absorbed (no licence or weak fit)

| Repo | Why not |
|---|---|
| [zarazhangrui/codebase-to-course](https://github.com/zarazhangrui/codebase-to-course) (5.6k) | no licence. Study its interactive-HTML course format for our own tutor output |
| [coleam00/excalidraw-diagram-skill](https://github.com/coleam00/excalidraw-diagram-skill) (4.9k) | no licence. `diagrams` + visual-explainer cover the need |
| [TovTechOrg/Tov-learn](https://github.com/TovTechOrg/Tov-learn) (36) | closest to "tutor + projects + dashboard" but immature. Read for ideas |
| [anthropics/skills](https://github.com/anthropics/skills) (180k) | no SPDX licence; mostly document / office skills, outside this goal |
| [awslabs/agent-plugins](https://github.com/awslabs/agent-plugins) | overlaps the installed `aws-core` plugin |
| [rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit) | an aggregator with nothing original |
| [foxj77/claude-code-skills](https://github.com/foxj77/claude-code-skills) | 21★; covered by `kubernetes-patterns` + wshobson |
| awesome-lists ([ashishps1](https://github.com/ashishps1/awesome-system-design-resources), [mehdihadeli](https://github.com/mehdihadeli/awesome-software-architecture)) | only links; mine them for Tier B/C if a gap appears |

## Gaps no repo fills

1. **The full learning loop.** No repo does all three: teach a topic hands-on,
   generate a lab project close to production, then visualise it. We build it
   ourselves (phase 3).
2. **Message brokers in depth** (Kafka partitions / consumer groups, RabbitMQ
   exchanges, SQS FIFO vs standard, exactly-once myths). Only wshobson's saga /
   CQRS skills come near. Our own `issue-flow` lab is the better source; its
   lessons should graduate into a library or brain entry.
3. **Horizontal scaling under load.** There is no "run k6 against it, watch the HPA
   scale, find the bottleneck" kit. That becomes a lab in phase 3.

## Plan

Each phase ends with a check that proves it, not a claim.

### Phase 1: absorb Tier A (one session, parallel)

Split: three `/absorb` runs as parallel forks (wshobson subset, visual-explainer,
system-design-skills). Each gets a background `reviewer` pass. `diagrams` is
not absorbed: Claude writes a thin `arch-diagram` skill by hand under `global/`.

- For each source, `/absorb` triages item by item against Giga's stack, writes
  `sources.json` entries with the pinned SHA, adds licence credit to `NOTICE.md`,
  and starts every entry at confidence 0.4 in `brain/library-ledger.md`.
- Overlaps with existing skills (`kubernetes-patterns`, `api-design`,
  `database-migrations`, `hexagonal-architecture`) are resolved by keeping one
  winner and recording the reason in `sources.json` skip reasons.

**Done when:** `bin/check-library.py` passes, `bin/install.sh` → `kit doctor`
shows 0 errors, and a trigger probe (`claude -p "<topic question>"`) loads the
expected skill for saga, CQRS, helm and visual-explainer.

### Phase 2: clone Tier B and run each once (Giga, with Claude as tutor)

- Clone into `newEra/refs/` and add one row per repo to `labs.md` with kind `ref`.
- Order: domain-driven-hexagon (closest to mogulkhan) → microservices-demo on
  kind → serverless-patterns (2–3 patterns matching auxiliary) →
  EventSourcing.NodeJS alongside issue-flow.

**Done when:** each repo runs locally (or deploys to a sandbox account), and
Giga has written a 5-line "what I'd steal for my own projects" note in
`me/concepts.md`.

### Phase 3: build the learning loop we could not find

A `lab` skill (or an extension of `tutor`) that, for one topic:

1. explains it with a **visual-explainer** page plus a **diagrams** architecture image;
2. generates a **docker-compose / kind lab** close to production
   (e.g. Node producer + Kafka + 2 consumers + Postgres + Prometheus/Grafana);
3. gives **failing tests and break-it exercises** (kill a broker, add a slow
   consumer, scale the deployment to 3), with graduated hints;
4. records progress in `me/concepts.md` (seen → explain → build → teach).

First topics in order: Kafka consumer groups → outbox + idempotent consumer →
horizontal scaling with HPA under k6 load → SQS/SNS fan-out on AWS → DDD
aggregates and bounded contexts.

**Done when:** one topic (Kafka consumer groups) runs end to end. The page
renders, the lab boots with one command, the tests fail before Giga's code and
pass after it, and the concept row moves to "build".

### Phase 4: keep it honest

- `/retro` moves confidence on every absorbed entry it touched (+0.1 held up,
  −0.2 wrong).
- `/curate` monthly: re-check upstream drift (`/absorb --update`) and drop
  entries still at 0.4 after 60 days unused.
- Re-run this search in about 3 months; the skill ecosystem moves fast.
