---
name: intent-review
description: Check a change, commit range or PR against the business requirement it was meant to deliver (dropped or half-done rules, skipped paths, broken invariants), via the intent-reviewer agent. `audit` mode checks a whole codebase against a requirements doc and an optional claims/submission file, then plans the fixes without making them. Use when Giga says /intent-review, "audit this repo against the requirements", "what's actually done vs the spec", a take-home or inherited-repo review, "does this match the ticket", "check X's commits against the requirement", or "review this for business value".
---

# Intent review

Tests and `reviewer` catch broken code. This catches *correct* code that
delivers the wrong thing. Giga's teams have shipped commits that passed
review and still broke business value, because a requirement was missed or
misread.

## 1. Gather (from the args, no questions if they're present)

- **Requirement.** Giga brings it: a file path, pasted text, ticket text. If
  they name a ticket you can't read (Jira key, link with no connector), ask
  them to paste it or point at a file. **Don't** reconstruct a spec silently.
  If none exists, offer two choices in one question: paste it, or let the
  agent infer it from commits/PR (its rows come back marked `assumed`).
- **Target.** Default: the working tree. `PR 42`: use `gh pr diff 42` and
  `gh pr view 42`. `A..B`: that commit range. A branch: compare against
  `git merge-base`. `audit [rev]`: the whole codebase at `rev` (default HEAD), no diff.
- **Claims** (audit only, optional): a path Giga names (submission note,
  README, PR text). If none is named, the agent looks for one itself.
- **Memory dir.** `autoMemoryDirectory` in `<repo>/.claude/settings.json` (or
  `settings.local.json`), else the repo's slug dir under `~/.claude/projects/`
  (the slug replaces `/`, `.` and `_` with `-`), then `/memory`.

Example: `/intent-review audit docs/requirements.md claims=SUBMISSION.md`.

## 2. Run

Launch `intent-reviewer` with requirement + target + memory dir. If the diff
is over ~100 lines or touches auth/money/data, also launch `reviewer` in
the background on the same target. They answer different questions.

In audit mode, skip `reviewer` unless Giga asks for bugs too; it answers
"is this code sound", not "is this what was asked".

## 3. Report to Giga

- Audit mode: Coverage line, overclaims, then the plan table. Offer to
  publish the report as a page if it is for someone else (an interviewer,
  a lead). Fixing starts only when Giga picks plan rows.

- The VERDICT line and the traceability table as returned; blockers first.
- `need-spec` or **Questions**: put them to Giga in one `AskUserQuestion`
  batch, then re-run only if an answer flips a verdict.
- **Invariant candidates**: append the ones Giga confirms to
  `<memory dir>/business-invariants.md` (create it from the template below,
  and add a `MEMORY.md` pointer). This file is how the next review gets
  sharper. It stays in the project's memory; client rules never go into
  `gigabrain/brain/`.

```markdown
---
name: business-invariants
description: Business rules for <project> that must hold after every change; read by intent-reviewer.
metadata:
  type: project
---

- **INV-1** <rule as an observable behaviour>. Why: <incident or source, date>. Paths: <entry points that must enforce it>.
```
