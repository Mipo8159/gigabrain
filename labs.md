# Projects connected to gigabrain

| Project | Path | Kind | Purpose | Memory |
|---|---|---|---|---|
| tracker | `sweeft/newEra/tracker` | lab | Jira-like monolith split step by step: gRPC auth, Kafka, outbox/inbox, DLQ, Elasticsearch, ClickHouse, sagas, LB; hybrid tutor mode (Giga writes each pattern core). Replaced issue-flow (deleted 2026-10-06) | `gigabrain/memory/newEra` |
| auxiliary | `sweeft/newEra/auxiliary` | own product | serverless video app + reusable template (auth, web, core deployed) | `gigabrain/memory/newEra` |
| pala | `sweeft/newEra/pala` | own product | JSON spec → narrated AWS explainer videos | `gigabrain/memory/newEra` |
| mcp | `sweeft/newEra/mcp` | lab | MCP server as a teaching exercise | `gigabrain/memory/newEra` |
| mogulkhan | `sweeft/newEra/mogulkhan` | lab | hexagonal NestJS template | `gigabrain/memory/newEra` |
| auctionize | `sweeft/newEra/auctionize` | legacy | superseded by auxiliary | `gigabrain/memory/newEra` |
| clasico | `sweeft/clasico` | **client** | paid work: `core` (NestJS/Nx: domain modules, advertisements), `admin` (React), `push` (Python FCM job). Onboarded 2026-10-02: local CLAUDE.md per repo + guard hook | **local only**, shared by all 3 repos: `~/.claude/projects/-home-mip-Desktop-workdir-sweeft-clasico/memory` |
| lutecia | `sweeft/lutecia` | **client** | remote-only: live Bitrix server over SSH as root, no local code. Onboarded 2026-10-02: CLAUDE.md + guard hook (secrets deny, ssh ask) | **local only**: `~/.claude/projects/-home-mip-Desktop-workdir-sweeft-lutecia/memory` |
| compose | `testlio/compose` | **client** (employer) | Testlio local dev env: Docker Compose for platform, app/app2 and ~50 services. Onboarded 2026-10-19: local CLAUDE.md (gigabrain × testlio-eng-hub split) + ask rules for wipes, stops and AWS | **local only**: `~/.claude/projects/-Users-g-kvachakhia-projects-testlio-compose/memory` |
| testlio workspace (12 repos) | `testlio/{serverless-services,infra,slack-integration-service,jira-plugin-service,integration-setup-service,integration-service,integration-setup-service-v2,build-service-v3,authorization-service-v2,storage-service,int-utils-service,vsts-mapper-service}` | **client** (employer) | Team GREY's repos. Onboarded 2026-10-20: root `testlio/CLAUDE.md` workspace map; CLAUDE.md in 7 repos, CLAUDE.local.md beside the team's file in 5; ask rules for deploy/migrate/push/AWS/secrets | **local only, shared**: `~/.claude/projects/-Users-g-kvachakhia-projects-testlio/memory` |

Client rows: lessons may be generalised into `brain/`; facts, code and data
never leave the machine.
