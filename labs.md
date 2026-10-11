# Projects connected to gigaforge

| Project | Path | Kind | Purpose | Memory |
|---|---|---|---|---|
| tracker | `sweeft/newEra/tracker` | lab | Jira-like monolith split step by step: gRPC auth, Kafka, outbox/inbox, DLQ, Elasticsearch, ClickHouse, sagas, LB; hybrid tutor mode (Giga writes each pattern core). Replaced issue-flow (deleted 2026-10-06) | `gigaforge/memory/newEra` |
| auxiliary | `sweeft/newEra/auxiliary` | own product | serverless video app + reusable template (auth, web, core deployed) | `gigaforge/memory/newEra` |
| pala | `sweeft/newEra/pala` | own product | JSON spec → narrated AWS explainer videos | `gigaforge/memory/newEra` |
| mcp | `sweeft/newEra/mcp` | lab | MCP server as a teaching exercise | `gigaforge/memory/newEra` |
| mogulkhan | `sweeft/newEra/mogulkhan` | lab | hexagonal NestJS template | `gigaforge/memory/newEra` |
| auctionize | `sweeft/newEra/auctionize` | legacy | superseded by auxiliary | `gigaforge/memory/newEra` |
| clasico | `sweeft/clasico` | **client** | paid work: `core` (NestJS/Nx: wenroll, advertisements), `admin` (React), `push` (Python FCM job). Onboarded 2026-10-02: local CLAUDE.md per repo + guard hook | **local only**, shared by all 3 repos: `~/.claude/projects/-home-mip-Desktop-workdir-sweeft-clasico/memory` |
| lutecia | `sweeft/lutecia` | **client** | remote-only: live Bitrix server over SSH as root, no local code. Onboarded 2026-10-02: CLAUDE.md + guard hook (secrets deny, ssh ask) | **local only**: `~/.claude/projects/-home-mip-Desktop-workdir-sweeft-lutecia/memory` |

Client rows: lessons may be generalised into `brain/`; facts, code and data
never leave the machine.
