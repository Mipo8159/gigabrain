---
name: claude-config-changes-need-human-installer
description: "Changing Claude's own config (settings, memory index, hooks, agents): auto mode blocks self-modification, so ship a reviewed script Giga runs; project agents don't load from parent dirs; prove a change with a per-directory `claude -p` probe; agents need a Read allow rule for files outside the repo."
metadata:
  type: reference
---

**In short:** let Giga run changes to Claude's own config, know where config
is found, and prove it loaded with a probe.

**1. Install through Giga.** In auto mode, edits to Claude's own settings,
memory index or background hooks are denied as self-modification (2026-10-01).
Don't retry or work around it. Write the change as a script (`bin/install.sh`,
`bin/link-project.sh`), show it, and let Giga run it. That's the right trust
boundary, and it saves the failed attempts. 2026-10-17: the same block hit
`brain/CORE.md` (loaded into every session), `global/hooks/coach.py` and the
`permissions.deny` list. Make the script refuse unless every old line
matches exactly once, make it idempotent, and dry-run it first with
`HOME=$(mktemp -d)` on a copy of the settings. 2026-10-19: bundle every pending blocked
step into one finalize script (pre-checks, apply, install, post-checks, optional `--commit`).
Giga ran it with one `! bash …` and a 4-day round closed in a single step.

**2. Where config is found (2026-10-02):**
- A project agent with the same name **replaces** the global one.
- Agent lookup does **not** check parent directories. A workspace of several
  repos needs the file in each repo's `.claude/agents/`. Symlink each to one
  workspace copy and hide it with `.git/info/exclude`, not `.gitignore`, so
  nothing lands in a client repo by accident.
- Project `.claude/settings.json` hooks load **mid-session**. A new guard may
  block your very next command (see [[test-guards-against-innocent-lookalikes]]).

**3. Prove it with a probe, not by reading the file.** `claude agents` manages
background agents; it doesn't list definitions. Per directory, run
`claude -p --model haiku "list your subagent types…"`.
Each probe used to pass through the coach hook and get logged to
`inbox/signals.jsonl` as a real prompt (on 2026-10-02, 7 probe rows had to be
removed at /curate). Since 2026-10-12 the hook skips headless runs.

**4. Agents can't reach files outside the repo by themselves (2026-10-13).** In another
repo, the `reviewer` subagent's `ls ~/projects/gigabrain/library/checklists` was
blocked ("may only list files in the allowed working directories"). It never
retried with Read and reviewed without checklists, silently (2/2 eval runs). A
headless Read of that path was also blocked. It worked with
`permissions.allow: ["Read(//abs/path/**)"]`, which is narrower than `additionalDirectories`
(that one also grants edits). An agent that reads shared files from gigabrain needs
that allow rule, and must use Read with an absolute path and say when the read fails.
The classifier also refused Claude's edits to that allow rule and to the
secret-scan allowlist, which is consistent with point 1: write the diff and let Giga apply it.
When Giga asked for it in-session ("do these steps for me", 2026-10-14), the same edits went
through. Fixed and proven: after `bin/install.sh`, a rerun showed the reviewer reading 4 checklists.
So for an unattended run, queue config changes as proposals; in an attended run,
apply them on Giga's explicit request.

Related: [[steer-parallelism-and-agent-roles]]
