---
name: test-guards-against-innocent-lookalikes
description: "Safety hooks and scripts must be tested in the state they really run in, with a table that includes innocent commands containing the trigger words"
metadata:
  type: project
---

A guard that silently passes or wrongly blocks is worse than none.

**Evidence:**
- 2026-10-01: a pre-commit scan passed before `git init`, then after it climbed
  one directory too high; in commit mode it would have scanned nothing and
  reported clean.
- 2026-10-02: a PreToolUse Bash guard (block `git push`/`commit`, block
  migrations without an inline local DB host) passed every deny case, but the
  table also contained `grep -rn 'git push' docs`, which it wrongly denied.
  Fix: anchor git rules to the start of each `&&`/`;`/`|` segment.
- 2026-10-02 (later): an "ask before ssh/scp/rsync" guard matched `ssh-keygen`,
  because `\b` treats `-` as a boundary. Fix: end the command name with
  `(\s|$)`, not `\b`.
- Same session: the hook, added to `.claude/settings.json` mid-session, **fired
  at once** and denied its own test command (the inline JSON contained the
  secret path it guards). It also denied the later /retro write, because the
  lesson text *named* that path. A "deny any mention" secrets rule is
  deliberately broad. Accept that cost, and write such text from a scratchpad
  script (`python3 script.py`) so the command line carries no trigger words.
- 2026-10-03: a global destructive-command guard passed its own 30-case table,
  then two background review passes found 25 holes. Among them: `git reset
  --hard … && rm -rf node_modules` was allowed whole (a "safe rm" regex anchored
  only at `$`); an apostrophe in a `# don't …` comment opened a phantom quote that
  hid every later command; `git -C <dir>` and `kubectl -n <ns>` slipped past
  verb patterns; and "deny once, allow the identical retry" let the model
  approve its own destructive command in auto mode. Fix: a quote-, comment- and
  heredoc-aware segment scanner that unwraps `bash -c`/`ssh`/`$(…)`, skips
  global options, returns **ask** (a human confirms) for destructive ops, and
  **fails closed** (ask) on unbalanced quoting or >64 KB input.
- 2026-10-05: an onboarding audit piped commands into a guard, read the **exit
  code**, and got "allow" for `git push` and an unguarded migration. The guard
  was fine: it answers with JSON `permissionDecision` (deny/ask) on stdout and
  exits 0, which is what lets it say "ask". The near-miss was a false "guard is
  broken". The live hook also blocked the test command itself, because the
  trigger word was in its argv. Building the commands inside a Python script avoided it.

**How to apply:**
- Test after install / inside the real repo, not only in a scratch folder.
- Pipe sample `{"tool_input":{"command":...}}` JSON into the hook and print an
  ok/FAIL table: every deny case, every ask case, **and** look-alikes that must
  pass (`grep` for the keyword, `git log | head`, `git checkout -- file`).
- Read the decision the way the harness does: parse `hookSpecificOutput.
  permissionDecision` from stdout (absent = allow); exit code 2 is only the
  legacy block path.
- Say honestly when a hook has only been JSON-tested and has not yet fired in a
  live session. Project `.claude/settings.json` hooks have loaded mid-session
  (2026-10-02), so expect them to guard your own next command.
- Command-name rules: anchor at segment start and end with `(\s|$)`, never
  `\bname\b` (`ssh` vs `ssh-keygen`, `git` vs `git-lfs`).
- A shell guard is a parser: tokenise per segment, unwrap wrappers, and when
  parsing fails, **ask** rather than allow. Irreversible ops get `ask`, never
  "deny once": a retry the model can trigger is not a human confirmation.
- Prove the suite can fail: re-inject a fixed bug and watch it go red. Every
  fixed hole becomes a dated table row (`bin/kit selftest`).
- After rewriting a guard in response to review, review it again: the
  rewrite itself was where the second pass found the blocker.

**Signal:** writing or changing any hook, permission rule or scanner that
decides allow/deny on command text.
**Next time:** table first (deny, ask, innocent look-alikes, wrapped and
chained forms), fail-closed default, background reviewer on the rewrite.
