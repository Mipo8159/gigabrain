---
name: auctionize-has-its-own-claude-setup
description: "auctionize was given the same .claude treatment as mogulkhan on 2026-08-13 — shared memory dir, three globally-symlinked skills, and deploy/remove behind a permission prompt."
metadata: 
  node_type: memory
  type: project
  originSessionId: 76ef8677-7efe-4340-854b-0fbea459db02
  modified: 2026-08-17T09:43:58.336Z
---

**Updated 2026-08-17:** this `.claude/` directory was **copied** (not moved) into
`newEra/auxiliary` when `auth/` and `web/` moved there, so both folders have the
same settings and skills. The copy was deliberate — `~/.claude/skills/*` are
symlinks *into* `auctionize/.claude/skills/`, and moving it would have broken
them globally. See [[auxiliary-is-the-app-auctionize-is-legacy]].

Set up 2026-08-13, on Giga's request to apply the same `.claude` rules to
`auctionize` as the other newEra folders:

- **Memory** — `auctionize/.claude/settings.local.json` sets
  `autoMemoryDirectory: ~/.claude/memory/newEra`, so a session started in
  auctionize reads and writes the same memory as `newEra/` and
  `newEra/mogulkhan/`. Extends [[session-setup-works-from-either-folder]].
- **Skills** — `add-lambda` (layer-by-layer route scaffolding),
  `add-aws-resource` (`iac/` tables, pools, per-function IAM) and
  `deploy-auctionize` (the verification ladder, deploy order, smoke tests,
  debugging). They deliberately mirror mogulkhan's `add-slice` /
  `add-migration` / `run-stack` trio. Symlinked from `~/.claude/skills/` into
  the repo, which stays the source of truth; each `description` names
  auctionize explicitly because they are visible from unrelated repos.
- **Permissions** — `auctionize/.claude/settings.json` allows `Bash` like
  mogulkhan's, but adds an `ask` list for `sls deploy` / `sls remove` /
  `serverless` equivalents and `aws ... delete-stack|delete-table|delete-user-pool`.

**Why the `ask` list:** it is the one place the otherwise-silent build loop is
allowed to stop. Deploying costs real money and `sls remove` destroys the
DynamoDB table with its data, so those stay confirmed even mid-loop — while
everything else stays autonomous, per
[[working-style-interview-then-autonomous-loop]]. `ask` rather than `deny` on
purpose: it prompts instead of hard-blocking.

**How to apply:** if a feature is going to end in a deploy, capture that
authorization during the build-loop interview (the "blast radius" question) and
record it in the contract's Assumptions, so it is not an interruption later.
Loop contracts go in `auctionize/.claude/loop/<slug>.md`. See
[[auctionize-is-serverless-aws-no-local-stack]].
