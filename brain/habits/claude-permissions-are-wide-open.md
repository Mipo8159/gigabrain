---
name: claude-permissions-are-wide-open
description: "Global settings allow Bash outright in auto mode (Giga's deliberate choice, 2026-08-13). No prompt is not authorization: still confirm anything irreversible or outward-facing."
metadata:
  type: project
---

**In short:** any shell command runs unprompted (Giga's choice), but confirm
anything that can't be undone or leaves the machine.

`~/.claude/settings.json` allows `Bash` outright, sets `defaultMode: auto`, and
allows Read, Glob, Grep, WebSearch, WebFetch, Skill, Artifact and Task. A short
`deny` list still blocks the catastrophic commands: `rm -rf /`, `rm -rf ~`,
`sudo rm`, force-push, `mkfs`, and `dd` to a device.

**Why:** Giga chose this on 2026-08-13 over a hand-picked allow list, after
being told plainly it lets Claude run any shell command without asking. Same
choice as `mogulkhan/.claude/settings.json`.

**How to apply:** no prompt doesn't mean the action was judged safe. Confirm
anything irreversible or outward-facing: pushing, deploying, deleting data,
touching other projects here. Look at a target before overwriting it. Supports
[[working-style-interview-then-autonomous-loop]].

**Giga's yes isn't the last gate (2026-10-23).** After Giga approved the plan,
the auto-mode classifier still denied the outward GitHub writes (a workflow
re-run and DELETEs of deployment records). Don't retry it or split it to get
past the block. Give each command as its own `! <cmd>` line so Giga runs it
in-session, then verify the result yourself. It took one round, and Giga ran
the commands one at a time.
**Signal:** a denial on an action the user already approved.
**Next time:** paste the `! ` lines at once, plus the check you'll run once they're done.
