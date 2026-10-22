---
name: answer-shape-short-first-map-for-how
description: "Lead with the short actionable answer; answer 'how does X work / are we using X' with one map table plus an honest gap list"
metadata:
  type: feedback
---

**In short:** give the short answer first, and answer "how does X work"
questions with one table plus an honest list of gaps.

1. **"What do I do" questions: short first.** At most 5 steps or 10 lines,
   then offer the long version in one line instead of writing it.
2. **"How does X work", "are we using X": a map.** One table (the thing, what
   it does, how it's used or its status), then an honest gap list: what is
   unused, unproven, or should have been used.

**Evidence:** 2026-10-01: "these are alot of instructions, please narrow it down
to few usefull steps" and "what are these folders, how do they work?".
2026-10-02: "are you aware of our gigabrain repo? how have you onboarded?" and
"are we using agents? in what way? or hooks and skills?". Both got an inventory
table, a "not used, and why" list and an untested-caveat. Giga moved on.
2026-10-20: networking ("how does the VPN put me inside, what is port
forwarding") explained as one building analogy (street address = public IP,
guard = firewall, tunnel = VPN, numbered windows = ports, a note on the guard's
desk = port forward), closed with a who-reaches-what table. Giga: "wow, nice
explanation", asked for more, then reasoned with it ("won't we need 22 for
CI?"). For unfamiliar infrastructure, **one sustained analogy beats jargon**.
Same session: a message drafted for the client's IT started at 8 questions;
"are we not asking too much?" cut it to the 3 only they could answer. **A
message for a third party carries only what they alone can answer.**

**Why:** Giga checks their mental model before acting. A wall of prose gets
sent back. A map without gaps hides the difference between "only instructed"
and "actually enforced or proven".

**How to apply:** honest status words. "Tested by piping JSON, not yet fired
live" beats "the hook protects you". Goes with
[[giga-wants-argued-recommendations]].

**Evidence (handover reports):** 2026-10-22, a 13-line library fix: the
completion report opened with a jargon table (span kinds, header names, a
lint-config cascade, version tags). Giga: "I don't understand what is going on
here, simplify and help me understand." The rewrite worked: one plain sentence
(what was missing, what was added), a 4-step "why it was broken", one line of
proof (before 0, after 1), and one line on where it stands. **A "done" report is
short-first too: say the result in plain words first, then evidence, then caveats.**
**Signal:** a report about to open with a table or internal names.
**Next time:** first line = what changed in everyday words; jargon only after.

**Evidence (setup help):** 2026-10-19, an SSH-key fix: Giga asked for "simple steps"
twice ("allright again, simple steps how to fix cleanly") after a long first answer.
In a long first-day onboarding the same day, numbered blocks Giga could paste one at a
time, each ending in one "reply done" checkpoint, kept ~40 prompts moving.
