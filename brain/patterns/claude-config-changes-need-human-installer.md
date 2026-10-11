---
name: claude-config-changes-need-human-installer
description: "Changing Claude's own config (settings, memory index, hooks, agents): auto mode blocks self-modification, so ship a reviewed script Giga runs; project agents don't load from parent dirs; prove a change with a per-directory `claude -p` probe."
metadata:
  type: reference
---

**1. Install through Giga.** In auto mode, edits to Claude's own settings,
memory index or background hooks are denied as self-modification or
unauthorized persistence (2026-10-01). Don't retry or work around it. Write the
change as a script (`bin/install.sh`, `bin/link-project.sh`), show it, and
let Giga run it. That's the right trust boundary, and it saves the failed attempts.

**2. Where config is discovered (2026-10-02):**
- A project agent with the same name **replaces** the global one.
- Agent discovery does **not** walk up to parent directories. A workspace made
  of several repos needs the file in each repo's `.claude/agents/`. Symlink each
  to one workspace copy and hide it with `.git/info/exclude`, not `.gitignore`,
  so nothing lands in a client repo by accident.
- Project `.claude/settings.json` hooks load **mid-session**. Expect a new guard
  to block your very next command (see [[test-guards-against-innocent-lookalikes]]).

**3. Prove it by probing, not by reading the file.** `claude agents` manages
background agents and doesn't list definitions. Run, per directory,
`claude -p --model haiku "list your subagent types…"`.
Each probe passes through the coach hook and is logged to
`inbox/signals.jsonl` as a real prompt. Note the timestamps and drop those rows
(on 2026-10-02, 7 probe rows had to be removed at /curate).

Related: [[steer-parallelism-and-agent-roles]]
