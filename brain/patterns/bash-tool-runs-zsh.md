---
name: bash-tool-runs-zsh
description: "On Giga's Mac the Bash tool runs zsh: an unquoted $VAR holding a list is ONE word (no splitting), and an unquoted glob that matches nothing aborts with 'no matches found' (grep --include=*.ts, set -- $x). Write literal lists in for-loops and quote every glob."
metadata:
  type: feedback
---

**In short:** write shell for zsh, not bash. `for r in $R` loops once over the
whole string; `--include=*.ts` and `ls dir/CLAUDE*.md` die before the command
runs if the glob has no match in cwd.

**The traps and their fixes:**
- **No word splitting.** `for r in $R` and `set -- $p` see one word. Use a literal
  list (`for r in a b c; do`) or a real array (`R=(a b c); for r in $R`). Pairs:
  `for x in repo:1 repo:2; do r=${x%%:*}; n=${x##*:}`. Flags for a probe go in an
  array too (`A=(--a --b="$T"); cmd "${A[@]}"`).
- **Unmatched globs abort.** Always quote globs passed to tools:
  `--include='*.ts'`, `find -name '*.md'`. Optional matches: `ls dir/*.md(N)` or
  test with `[ -e ]` first.
- **A word starting with `=` expands to a command path** (`=ls` → `/bin/ls`), so
  `echo ===`/`echo ====FILES` fails with `== not found`. Use `echo '---'` as the
  only separator.
- **`$VAR:` followed by a letter is a history modifier** (`:a :h :t :r :e :s :u :l`),
  inside quotes too: `git show $B:path` became `origin/masterpplication/...`, and
  `"$b:tests/test.sh"` read `$b` with `:t`. Always brace: `"${B}:path"`,
  `"${a}:test"`, in every `git show`/`git cat-file` ref and image tag.
- **Never name a variable `path` (or `cdpath`, `fpath`, `manpath`):** zsh ties the
  lowercase array to `PATH`, so `for path in a b` wipes PATH and the next command
  fails with `command not found` (2026-11-09, `curl`). Use `ep`, `p`, `f`.
- **No `node` on PATH:** the tool's shell doesn't always load nvm from `.zshrc`, so a
  Node-backed script (`bin/check-lesson`) dies with `env: node: No such file or directory`
  (2026-11-09). Prefix the call with
  `export PATH="$HOME/.nvm/versions/node/$(ls ~/.nvm/versions/node | tail -1)/bin:$PATH";`.
  Same root cause, 2026-11-10: an MCP server launched with `npx` failed to connect
  (`Executable not found in $PATH: npx`). Tell Giga it's PATH, not a missing tool.
- **Giga's own terminal is zsh too:** the `! <cmd>` prefix works only in the Claude
  prompt. In that terminal a leading `!` is history expansion, so give the command
  without `!`.

**Hits:** 17+ (2026-11-10/11: `"$B:terraform/…"` read as the `:t` modifier → bad git path, fix `${B}:`; `echo ======` again, mid-retro), between 2026-10-20 and 11-06 (globs ×5, `=`-words ×8 (latest: `echo =====` as a separator, 11-06 cleanup), `:`-modifiers
×4; the 4th, 11-06: `$base:apps/...` became an absolute path via `:a`), most of them after this entry and its CORE line existed. Reading the rule
doesn't stop the `=` slip when composing long one-liners fast. **Open fix:** a
PreToolUse check in `global/hooks/guard.py` that denies a bare word starting with
`=` ("use echo '---'"), not another reminder.

**2026-11-06/08 (again):** `gh api repos/…/statuses?per_page=1` unquoted → `no matches found`
(the `?` is a glob); `echo ====` once more aborted a whole read command. Quote every API path
that holds `?`/`&`.

**Signal:** a for-loop over a variable, `set --`, `--include=`, `*` in an argument,
a word starting with `=`, `$VAR:` followed by a letter.
**Next time:** quote the glob, inline the list and brace the variable before
running, not after the error.

Related: [[private-registry-404-means-auth-not-wired]] (the word-splitting case in a token probe).
