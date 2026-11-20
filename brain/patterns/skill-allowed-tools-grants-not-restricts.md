---
name: skill-allowed-tools-grants-not-restricts
description: "A skill's `allowed-tools` pre-approves the listed tools while the skill runs; it does not limit Claude to them. A broad Bash pattern there silently approves writes, so scope each entry to the exact read-only command form."
metadata:
  type: feedback
---

**Rule:** treat `allowed-tools` in a SKILL.md as a list of permissions the
skill grants, not as a sandbox. Write each Bash entry as the narrowest command
form the steps use: `Bash(git -C * log *)`, not `Bash(git -C *)`;
`Bash(python3 *<skill>/scripts/<file>.py *)`, not `Bash(python3 *)`;
`Bash(gh api repos/*/pulls/*/comments*)` for a GET.

**Why:** on 2026-11-20 a new read-only skill listed `Bash(git -C *)` and
`Bash(python3 *)`. A background reviewer pointed out that these approve
`git -C <repo> push --force` and any `python3 -c`. The skill's own Rules said
"read-only", and nothing would have enforced it.

**How to apply:** for each entry, ask "what is the worst command this pattern
matches?" If the answer writes, narrow the pattern. Read-only intent goes in
the Rules *and* in the patterns.

**Signal:** writing or reviewing `allowed-tools:` in any skill frontmatter.
**Next time:** list the exact commands from the steps, then pattern them.

Related: [[edit-prompts-behind-baseline-evals]].
