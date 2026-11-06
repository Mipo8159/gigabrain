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

**More evidence (2026-10-21):** `--include=*.js` aborted again, one day after
this entry was written, so read the Signal line *before* typing a grep. New
case: `echo ===` fails with `== not found`, because zsh expands a word
starting with `=` into a command path (`=ls` → `/bin/ls`). Use `echo '---'`.

**Third hit (2026-10-22):** `--include=*.ts` and `echo ==USES` failed again in a
cross-repo grep, each costing a rerun. The entry existed but isn't loaded unless
something recalls it, so the rule now has one line in CORE.md.

**Fourth hit (2026-10-22, same day, after the CORE line landed):** unquoted
`--include=*.yml` and `echo =====` failed again in a cross-repo sweep. The rule
is loaded; the slip happens when composing long one-liners fast. Use `'---'` as the
only separator.

**Fifth hit (2026-10-27): history modifiers.** `B=origin/master; git show $B:path/file`
**Sixth hit (2026-10-28), twice in one session:** `"$b:tests/test.sh"` became the
tail of `$b`, and `"t130-$repo-$a:test"` became `…-baseest`. Inside quotes too. In
loops over refs or image tags, always brace: `"${b}:path"`, `"${a}:test"`.
**Seventh hit (2026-11-02):** `echo ====` inside a retro's gather step, a third time for that exact form. Reading the rule doesn't stop it; a PreToolUse check for a word starting with `=` would.
**Eighth hit (2026-11-02, later):** `echo ===FILES` as a section separator in a PR inspection, same day as the seventh. Eight hits, no hook yet: the `=`-word check belongs in `global/hooks/guard.py` (deny with "use echo '---'"), not in another reminder.
silently became `origin/masterpplication/...`, because zsh read `$B:a` as the
`:a` (absolute path) modifier. Any `$VAR:` followed by a letter (`:a :h :t :r :e
:s :u :l`) is a modifier. Write `"${B}:path"`. `echo ===` failed again the same day, and `echo =====` again in a later session that day (a retro, while checking this very rule).

**Signal:** a for-loop over a variable, `set --`, `--include=`, `*` in an argument, a word starting with `=`, `$VAR:` followed by a letter.
**Next time:** quote the glob and inline the list before running, not after the error.
**Ninth hit (2026-11-02, evening):** `echo =====` between sections of a code sweep. Still no hook.
**Giga's own terminal is zsh too (2026-11-02):** the `! <cmd>` prefix works only in the Claude
prompt. Pasted into that terminal, a leading `!` is history expansion/negation and the command
misfires. When Giga runs a command in their own terminal, give it without `!`.

2026-11-03: hit again, `git show "$b:tests/test.sh"` read `$b` with the `:t` modifier and every repo looked like it had no CI script. Write `"${b}:path"` in every `git show`/`git cat-file` ref.
2026-11-05/06: two more hits in one work session, `echo ======` between sections, once during analysis and once during the retro that read this entry. Logging hits isn't working; the fix is a PreToolUse guard that rejects a bare word starting with `=` before the shell sees it.
