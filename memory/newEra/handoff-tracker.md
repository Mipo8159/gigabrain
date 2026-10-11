---
name: handoff-tracker
description: "Failure-first handoff for newEra/tracker: step 0 state, dead ends, next step."
metadata:
  type: project
---

repo: /home/mip/Desktop/workdir/sweeft/newEra/tracker/.git
updated: 2026-10-06
## Worked (each with: confirmed by …)
- Step 0 scaffold: stub run → only the 6 workflow e2e tests red, 22 green; reference workflow → 28/28 e2e ×3 + 24/24 unit; db:migrate + boot on dev DB; /health/ready ok.
- Reviewer findings (last-admin, deactivated tokens, int overflow 500, PII in DB-error logs, migrations on boot, JWT secret check, missing tests) all fixed; each has an e2e case.
- Step-0 visual published (https://claude.ai/artifact/5tvPunMVe2FQyg9d2HaUwV), headless-clicked light/dark/phone, no errors.
## Failed — do not retry
- `pkill -f dist/main.js` kills the Bash tool's own shell (exit 144). Kill by PID/port.
- TypeORM `tx.query('UPDATE … RETURNING')` returns [rows, count]; use the query builder's .returning() and read .raw.
- Prettier rewrote files after the first pass, so later exact-string edits missed: re-read before editing.
## Not tried yet
- Giga's workflow.ts (theirs to write; don't implement it).
- No commits yet (Giga makes the first one).
## Next step
- After Giga's workflow is green: "step 1" = nest monorepo, extract users/auth, ProjectAccess over gRPC with a deadline, fail-closed; re-run kit apply when infra is added.
