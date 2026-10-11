---
name: mcp-server-is-a-teaching-exercise
description: "newEra/mcp exists to teach Giga MCP in depth, so design rationale matters more than shipping speed."
metadata: 
  node_type: memory
  type: project
  originSessionId: 5be04712-1d75-48dd-a56d-8b0687a50e72
  modified: 2026-08-13T08:26:04.858Z
---

`newEra/mcp` (mogulkhan-mcp) was built starting 2026-08-12 as a *practical teaching
example* — Giga asked to be taught MCP servers in depth and to have one built as the
worked example. It is not production work with a deadline.

**Why:** this changes what "good" means. The README's "Not implemented
(deliberately)" section is a syllabus, not a backlog: `delete_post` is parked
specifically to demonstrate a destructive tool with `destructiveHint`, and
resources/prompts are parked as MCP's other two primitives.

**How to apply:** explain the reasoning behind each design choice rather than just
making it, and keep the parked items parked until they're used as their intended
lesson. `npm run verify` in `mcp/` is the end-to-end proof (spawns the server over
stdio and calls every tool against a live mogulkhan).
