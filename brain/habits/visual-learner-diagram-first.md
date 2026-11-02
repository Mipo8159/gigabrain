---
name: visual-learner-diagram-first
description: "Giga is a visual learner: on 'visualize', 'diagram', 'grasp', 'I need to understand (better)', answer diagram-first — one simple diagram of the real mechanism, then 3-6 numbered steps, plus a small stepper/animation when order or flow matters. Load skill visual-explainer (teach for a whole subject)."
metadata:
  type: user
---

**In short:** when Giga says *visualize*, *draw it*, *diagram*, *grasp*, or *I need
to understand this better*, the answer starts with a picture, not prose.

**Shape of the answer**
1. **One diagram that shows the mechanism**: boxes = things, arrows = what flows
   (request, message, row, token), labelled with the real names. Not a decoration.
2. **3-6 numbered steps** that walk the arrows in order.
3. **Motion only when it carries meaning**: a stepper or a small animation when
   order, timing or state changes are the point (queues, retries, migrations, auth flows).
4. **Schemas as pictures**: tables as boxes with keys, relations as arrows with
   cardinality; state machines as states + transitions.
5. One "what breaks if…" question at the end to check understanding.

**Medium:** in the terminal, a compact ASCII/Mermaid sketch inline. For anything
with more than ~6 boxes or with motion, load `visual-explainer` (or `teach` for a
whole subject) and build the HTML page; work content stays a local file
([[nothing-leaks]]).

**Why:** Giga said so directly (2026-10-29: "I am visual learner"), and the
`teach`/`learn` lessons with diagrams and steppers are the ones they use.

**How to apply:** the coach hook adds a "visual" cue on these words; load the skill
rather than offering it ([[scope-skills-with-local-plugins]]: "offer /X" cues fail).
