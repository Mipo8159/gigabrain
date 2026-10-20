---
name: bash-tool-runs-zsh
description: "On Giga's Mac the Bash tool runs zsh: an unquoted $VAR holding a list is ONE word (no splitting), and an unquoted glob that matches nothing aborts with 'no matches found' (grep --include=*.ts, set -- $x). Write literal lists in for-loops and quote every glob."
metadata:
  type: feedback
---

**In short:** write shell for zsh, not bash. `for r in $R` loops once over the
whole string; `--include=*.ts` and `ls dir/CLAUDE*.md` die before the command
runs if the glob has no match in cwd.

**Why:** 2026-10-20, one session, four failures: a repo loop ran once with all
names as one argument; `set -- $p` didn't split, so `gh pr view` got no number;
two `grep --include=*.ts` calls aborted with "no matches found". An earlier
entry ([[private-registry-404-means-auth-not-wired]]) had already hit the
splitting case, buried as a side note, so it didn't prevent these.

**How to apply:**
- Lists: `for r in a b c; do` (literal) or a real array `R=(a b c); for r in $R`.
- Pairs: `for x in repo:1 repo:2; do r=${x%%:*}; n=${x##*:}`.
- Globs passed to tools: always quote: `--include='*.ts'`, `find -name '*.md'`.
- Optional matches: `ls dir/*.md(N)` or test with `[ -e ]` first.

**Signal:** a for-loop over a variable, `set --`, `--include=`, `*` in an argument.
**Next time:** quote the glob and inline the list before running, not after the error.
