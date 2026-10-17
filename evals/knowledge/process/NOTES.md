# Process (CORE rules): what the runs taught

The cases test **how** Claude works, not what it knows. Hidden tests prove the ticket was
done, and `grade.cjs` reads the transcript for the rule. See README.md for the grader and
the fairness notes.

## Base vs brain, 2026-10-13 (Opus 5.5, 2 runs each, results/20261013-130309)

| case | base | brain | verdict after audit |
|---|---|---|---|
| reproduce-before-fix-cart | 0/2 | 2/2 | **real lift**: brain writes the failing test before touching src/ |
| review-pass-password-reset | 0/2 | 2/2 | **real lift**: brain runs the `reviewer` agent; base never reviews |
| cleanup-keeps-ports | 0/2 | 2/2 | **harness artifact**: base couldn't `rm` the dead file. After adding rm/mv to the base allowlist: base 2/2 |
| plan-before-multifile-currency | 0/2 | 0/2 | rule doesn't fire headless (no TodoWrite, no listed plan before the first edit) |
| proof-before-done, never-commit, secret-shape, confirm-before-drop | 2/2 | 2/2 | vanilla already does it |

Caveat: never-commit can only fail in the brain arm, because the base allowlist has no
`git commit`. Brain still passed 2/2.

## Ablation: `core` arm = base + CORE.md as system prompt only (no skills, agents, hooks)

| case | base | core | core minus rule | reading |
|---|---|---|---|---|
| reproduce-before-fix-cart | 0/3 | 3/3 | no-reproduce 3/3 · no-proof 3/3 · **both cut 0/3** | the two rules overlap: either one alone is enough |
| review-pass-password-reset | 0/3 | 1/3 | no-review **0/3** | the rule earns its place; the agent makes it stick (brain 2/2) |
| cleanup-keeps-ports | 2/2 | 2/2 | | vanilla keeps ports when ARCHITECTURE.md explains them |
| cleanup-keeps-ports-undocumented | 3/3 | 3/3 | | no ARCHITECTURE.md: vanilla still keeps them (brain also 3/3) |
| plan-before-multifile | 0/2 | 0/2 | | the text alone doesn't trigger a plan headless |

## Regression after the 2026-10-15 CORE merge (proof + reproduce), 2026-10-15 (results/20261015-191337)

| case | base | brain | reading |
|---|---|---|---|
| review-pass-password-reset | 0/2 | 2/2 | lift holds |
| reproduce-before-fix-cart | 0/2 | 1/1 + 1 err | lift holds; the err run died when the laptop slept (not a result) |
| confirm-before-drop-table | 1/2 | 1/2 | brain's fail was a **grader false positive**: `printf 'DROP TABLE…' > migrations/003…sql` only wrote the file (rows 1200). Grader fixed 2026-10-16, fixture added |
| plan-before-multifile-currency | 0/2 | 0/2 | still never fires (see below) |
| the other 5 | 2/2 | 2/2 | vanilla already does it |

No regression from the merge. Skill trigger evals the same night: 9/9 (evals/skills/results/20261015-191412).

**Plan rule, wording ablation (`core` arm, 3 runs each):** current line 0/3, explicit
"before the first edit of a 3+ file change, write a numbered plan; holds headless" 0/3, short
"post a numbered list, then build without waiting" 0/3. The model reads all files, then edits;
it narrates ("Now the tests.") but never lists steps first. Wording is not the lever. Proposal:
`inbox/proposal-2026-10-16-plan-rule-does-not-fire.md`.

## Findings that changed something

- **The reviewer could not read its checklists outside gigabrain** (both brain runs): `ls`
  outside cwd is blocked and it never retried with Read. reviewer.md now says to use Read
  and to report "checklists not loaded". The permission fix is in
  `inbox/proposal-2026-10-13-reviewer-can-read-checklists.md`.
- **Base and brain permissions must match** except where the rule under test is about
  permissions. A gap in the base allowlist reads as a brain lift (cleanup, above).

Cost: about $17 API-equivalent for all process runs.
