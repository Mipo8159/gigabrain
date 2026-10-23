---
name: pushed-repo-tooling-keeps-private-state-in-a-sibling
description: "A tool in a pushed repo that records local state (a project registry with paths) re-leaks private names on every run, so scrubbing the file isn't enough: split private entries into a gitignored sibling, merge on read, write the private file first; keep the leak-scan term list itself untracked."
metadata:
  type: feedback
---

**In short:** if a pushed repo's own tooling writes machine state (registered
repo paths, kinds, dates), private entries must go to a gitignored sibling file.
A one-time scrub of the tracked file is undone by the next tool run.

**Why:** 2026-10-23, gigabrain. The project registry (`kit/projects.json`, tracked)
held work repo paths that name the employer. The scrub plan listed 4 files; the
real count was 7, and the registry was the one that would regress: every
`kit apply` on a work repo wrote the path back. Also, the leak scan's term list
was itself a tracked file, so adding the employer's name to it would have
leaked the name. A reviewer then found a second reader (`kit-audit --all`) that
read only the tracked file and silently skipped every private repo.

**How to apply:**
- Split by sensitivity at write time: `save()` writes private-kind entries to
  `<name>.local.json` (gitignored) and the rest to the tracked file;
  `load()` merges both. Put the sibling next to the main file, so a test that
  redirects the main path also redirects the sibling.
- Write the private file first: a crash between the two writes then leaves a
  duplicate in the private file, never a private entry in the tracked one.
- Grep for every reader of the file (`grep -rn '<file name>' bin/`) and make each merge both.
- Leak-scan terms that are themselves sensitive live in an untracked
  `<terms>.local` that the hook also reads.
- Prove it: a selftest case (private entry lands only in the sibling, mutation-checked)
  and a staged dummy file containing the term is blocked by the hook.

**Signal:** "X must never reach the pushed repo" when X shows up in a file a
tool writes, not one a person writes.
**Next time:** fix the writer and every reader, not just the file contents.

Related: [[local-only-edits-get-a-commit-guard]], [[secrets-land-in-readme]], [[own-tooling-fails-silently]].
