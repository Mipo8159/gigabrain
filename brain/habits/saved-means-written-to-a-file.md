---
name: saved-means-written-to-a-file
description: "When Giga says \"save this\" (a draft message, a plan, a list), write it to a file in the workspace in that turn and point project memory at it. The transcript is not storage: it gets compacted and new sessions can't see it."
metadata:
  type: feedback
---

When Giga asks Claude to save or keep something for later, write it to a
file in that same turn and say the path. If a later session might need it,
add a project-memory line pointing at the file.

**Why:** 2026-10-27, work repo. Giga had asked earlier in a long session to
save a good team-channel message. When they came back to it ("we already had a
good slack message … which I asked you to save. remember that?"), it was in no
file. Claude had to search the session transcript to recover it. Had the
session been compacted or closed, the draft would have been gone.

**How to apply:** for "save it", "keep this", or "remember this draft": write
`<workspace>/<ticket>-<what>.md`, reply with the path, and add a one-line
memory pointer. Overwrite that same file when the draft changes.

**Signal:** "save", "keep", "remember this", or "for later" about anything
Claude wrote.
**Next time:** write the file and the memory pointer in that turn, before
going on with the task.

Related: [[outward-claims-carry-their-proof]]
