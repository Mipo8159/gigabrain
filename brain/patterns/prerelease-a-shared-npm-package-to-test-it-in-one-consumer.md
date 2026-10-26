---
name: prerelease-a-shared-npm-package-to-test-it-in-one-consumer
description: "To prove a change to a shared npm library in a real consumer's staging before the owners release it: publish an x.y.z-beta.N under the `beta` dist-tag from a tag on a side commit, pin it exactly in the consumer PR, measure before/after, then swap to ^x.y.z only after the real publish. Caret ranges never match prereleases and lockfiles stop drift, so the beta can't leak. A version without the hyphen can land on `latest`."
metadata:
  type: project
---

**In short:** when a library owner is slow and you need proof that a library
change works in a consumer, ship a prerelease that only that consumer pins.

**Why:** 2026-10-26, work repo. A tracing change in a shared Node library had
to be proven in one service before the owning team released it. The beta route
gave a measured staging before/after in one afternoon, and every consumer was
safe from it:
- `^1.2.4` never resolves a prerelease.
- All 28 consumers had lockfiles.
- npm's `latest` didn't move.

Two traps showed up when running the publish workflow's own tag logic on the
real version string. `1.3.0beta` (no hyphen) derived **`latest`**: it would
have been released as the normal version. And a local branch created from the
PR branch tracked it, so a plain `git push` would have put the beta commit
into the PR.

**How to apply:**
1. Check who may publish: the tag rules, the publish environment's reviewers,
   and who released before (`gh run list` on the publish workflow + the
   approvals API). Tell the owner in writing; don't wait for a yes when the
   beta can't reach anyone.
2. Take a side branch off the PR head and run `git branch --unset-upstream`.
   Run `npm version x.y.z-beta.0 --no-git-tag-version`, commit, tag, and push
   **only the tag**.
3. Before tagging, run the workflow's dist-tag expression against the real
   `package.json`. Then run its install and build steps on a clean
   `git archive` of the tagged commit, plus the tests on the consumers' Node
   version (Docker `node:<ver>-alpine` when it isn't installed).
4. Approve the publish only after its log names the `beta` dist-tag. Check
   `npm view <pkg> dist-tags` afterwards: `latest` must be unchanged.
5. In the consumer PR, pin it exactly (`--save-exact`) and commit only
   `package.json` and the lockfile. Script those guards, because a hand-run
   `commit -a` sweeps in local-only edits. Expect the PR bot to block on the
   prerelease pin. That's the guard you want.
6. Take a baseline measurement *before* deploying the beta, then the same
   query after.
7. The swap to `^x.y.z` waits for the real publish. Before it, no lockfile can
   be generated and the consumer's CI goes red.

**Signal:** "the owner isn't answering", "can I test the library change on
staging myself", or any library PR whose value only shows inside a consumer.
**Next time:** precedent check → side-branch tag → dist-tag dry run → beta
publish → exact pin in the consumer → before/after → swap after the real
release.

Related: [[outward-claims-carry-their-proof]], [[local-only-edits-get-a-commit-guard]], [[prove-integration-without-real-target]]
