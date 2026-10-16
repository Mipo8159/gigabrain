---
name: regenerate-goldens-narrowly
description: When an intended change breaks a golden/reference test (hashes, snapshots, fixtures), regenerate only the entity you meant to change, assert every other entity's output is byte-identical, and rewrite fixture files in their original format so the diff shows only the intended lines.
metadata:
  type: project
---

**In short:** an intentional golden update is still a change to the test's oracle. Make it
narrow and prove the rest held.

1. **Regenerate one entity, check the others.** A script runs the new code on the golden's
   own input and replaces only the entries you meant to change. For every other entity it
   compares keys and hashes with the old golden and prints `unchanged` or `CHANGED`. Any
   `CHANGED` you didn't intend is a bug, not a golden to refresh.
2. **Keep the fixture's format.** Before rewriting a JSON fixture, check that
   `dump(load(file)) == file` with the file's own indent and escaping (`indent=1`,
   `ensure_ascii`). Then the diff is only the removed or changed lines (22 deletions, not
   350 changed lines), and a reviewer can read it.
3. **Snapshot the source first** (rsync to the scratchpad when the folder isn't a git repo),
   so `git diff --no-index` gives a reviewable diff afterwards.

**Why:** 2026-10-15, a CSV exporter whose ledger hashes are fixed: merging product rows into
deals had to change the deal hashes. Without the check, a stray change to another entity's
hash would re-send every product and contact once. The first rewrite of a fixture also
reformatted the whole file and hid the 22-line change.
**How to apply:** whenever a reference/golden/snapshot test fails *because of* the change you
meant to make.
**Signal:** "regenerate the golden", "update the snapshot", a hash test failing after an
intended change.
**Next time:** write the compare-the-rest script before regenerating; quote its
`unchanged` lines as the proof.
