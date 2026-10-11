---
name: claude-permissions-are-wide-open
description: "Global settings allow Bash outright in auto mode (Giga's deliberate choice, 2026-08-13). No prompt is not authorization: still confirm anything irreversible or outward-facing."
metadata:
  type: project
---

`~/.claude/settings.json` allows `Bash` outright, sets `defaultMode: auto`,
and allows Read/Glob/Grep/WebSearch/WebFetch/Skill/Artifact/Task. A short `deny`
list still hard-blocks catastrophic commands (`rm -rf /`, `rm -rf ~`, `sudo rm`,
force-push, `mkfs`, `dd` to a device).

**Why:** Giga chose this on 2026-08-13 over a curated allowlist, after being told
plainly that it lets me run any shell command in the tree without asking. They had
already made the same choice for `mogulkhan/.claude/settings.json`.

**How to apply:** the absence of a prompt is not a judgment call being made for me.
Still confirm before anything irreversible or outward-facing — pushing, deploying,
deleting data, touching other projects on this machine — and still look at a target
before overwriting it. Supports [[working-style-interview-then-autonomous-loop]].
