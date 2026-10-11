---
name: library-ledger
description: Confidence and dated evidence for every imported library entry (skills, reviewer checklists). /retro adds evidence when an entry is used in a real session; /curate promotes (≥0.7, 2+ projects) or retires (<0.3, or 90 days with no evidence) entries.
metadata:
  type: reference
---

Rules: `library/README.md` § Confidence. Start 0.4; held up in use +0.1;
wrong or outdated −0.2 and `needs-edit: …` (for /absorb); project convention
differed 0 (evidence only). `Added` is when the row was first absorbed and
drives the 90-day check; /absorb --update never changes it.
Evidence is one dated, generalised line: no client names, URLs or schemas.

| Entry | Source | Added | Confidence | Evidence (date · project kind · what happened) |
|---|---|---|---|---|
| skill `nestjs-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `backend-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `api-design` | ecc | 2026-10-03 | 0.4 | — |
| skill `hexagonal-architecture` | ecc | 2026-10-03 | 0.4 | — |
| skill `react-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `react-performance` | ecc | 2026-10-03 | 0.4 | — |
| skill `react-testing` | ecc | 2026-10-03 | 0.4 | — |
| skill `python-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `python-testing` | ecc | 2026-10-03 | 0.4 | — |
| skill `fastapi-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `golang-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `golang-testing` | ecc | 2026-10-03 | 0.4 | — |
| skill `postgres-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `redis-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `database-migrations` | ecc | 2026-10-03 | 0.4 | — |
| skill `docker-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `kubernetes-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `deployment-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `verification-loop` | ecc | 2026-10-03 | 0.4 | — |
| skill `search-first` | ecc | 2026-10-03 | 0.4 | — |
| skill `secure-coding` | ecc | 2026-10-03 | 0.4 | — |
| checklist `typescript` | ecc | 2026-10-03 | 0.4 | — |
| checklist `react` | ecc | 2026-10-03 | 0.4 | — |
| checklist `python` | ecc | 2026-10-03 | 0.6 | 2026-10-03 · own python tooling (kit/guard) · reviewer flagged real issues it lists (input validation, fail-open paths); 2026-10-05 · client CLI exporter (stdlib) · lock/partial-file/except-path findings were real |
| checklist `go` | ecc | 2026-10-03 | 0.4 | — |
| checklist `database` | ecc | 2026-10-03 | 0.6 | 2026-10-05 · read-only MSSQL ETL · date-literal language trap, nondeterministic STRING_AGG, join-multiplied keys were real; 2026-10-06 · Nest lab monolith · migrations-on-boot replica race, unindexed membership lookup, int4 overflow → 500 were real |
| checklist `security` | ecc | 2026-10-03 | 0.7 | 2026-10-03 · own config/security tooling · secret-masking and unsafe-default findings were real; 2026-10-05 · PII exporter · unkeyed phone hash reversible, world-readable state, guard-regex bypasses were real; 2026-10-06 · Nest lab auth baseline · query params with PII in default error logs, unvalidated JWT secret, deactivated-user token window were real |
| checklist `silent-failures` | ecc | 2026-10-03 | 0.7 | 2026-10-03 · own python tooling · fail-open hook paths and swallowed errors were real findings; 2026-10-05 · cron exporter · cursor advanced on partial run (silent data loss) was a real blocker; 2026-10-06 · Nest lab · readiness catch discarding the cause, display code inside a write transaction were real |
| skill `contract-first` | ecc | 2026-10-03 | 0.4 | — |
| skill `council` | ecc | 2026-10-03 | 0.4 | — |
| skill `production-audit` | ecc | 2026-10-03 | 0.4 | — |
| skill `architecture-decision-records` | ecc | 2026-10-03 | 0.4 | — |
| skill `loop-design-check` | ecc | 2026-10-03 | 0.4 | — |
| checklist `types` | ecc | 2026-10-03 | 0.4 | — |
| checklist `tests` | ecc | 2026-10-03 | 0.5 | 2026-10-06 · Nest lab · missing IDOR, viewer-write, forged-token and failed-write atomicity cases were real gaps; all added |
| skill `error-handling` | ecc | 2026-10-03 | 0.4 | — |
| skill `mcp-server-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `e2e-testing` | ecc | 2026-10-03 | 0.4 | — |
| skill `inherit-legacy-style` | ecc | 2026-10-03 | 0.4 | — |
| skill `accessibility` | ecc | 2026-10-03 | 0.4 | — |
| skill `make-interfaces-feel-better` | ecc | 2026-10-03 | 0.4 | — |
| skill `cisco-ios-patterns` | ecc | 2026-10-03 | 0.4 | — |
| skill `netmiko-ssh-automation` | ecc | 2026-10-03 | 0.4 | — |
| skill `network-bgp-diagnostics` | ecc | 2026-10-03 | 0.4 | — |
| skill `network-config-validation` | ecc | 2026-10-03 | 0.4 | — |
| skill `network-interface-health` | ecc | 2026-10-03 | 0.4 | — |
| skill `homelab-network-readiness` | ecc | 2026-10-03 | 0.4 | — |
| skill `homelab-network-setup` | ecc | 2026-10-03 | 0.4 | — |
| skill `homelab-pihole-dns` | ecc | 2026-10-03 | 0.4 | — |
| skill `homelab-vlan-segmentation` | ecc | 2026-10-03 | 0.4 | — |
| skill `homelab-wireguard-vpn` | ecc | 2026-10-03 | 0.4 | — |
| skill `seo` | ecc | 2026-10-03 | 0.4 | — |
| skill `manim-video` | ecc | 2026-10-03 | 0.4 | — |
| skill `remotion-video-creation` | ecc | 2026-10-03 | 0.4 | — |
| skill `video-editing` | ecc | 2026-10-03 | 0.4 | — |
| skill `videodb` | ecc | 2026-10-03 | 0.4 | — |
| skill `fal-ai-media` | ecc | 2026-10-03 | 0.4 | — |
| skill `ui-demo` | ecc | 2026-10-03 | 0.4 | — |
| skill `content-engine` | ecc | 2026-10-03 | 0.4 | — |
| skill `email-ops` | ecc | 2026-10-03 | 0.4 | — |
| skill `mailtrap-email-integration` | ecc | 2026-10-03 | 0.4 | — |
| skill `brand-voice` | ecc | 2026-10-03 | 0.4 | — |
| skill `visual-explainer` | visual-explainer | 2026-10-06 | 0.4 | — |
