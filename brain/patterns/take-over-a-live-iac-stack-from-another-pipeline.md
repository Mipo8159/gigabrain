---
name: take-over-a-live-iac-stack-from-another-pipeline
description: "Moving an existing, live IaC stack (SAM/CloudFormation) to a new CI pipeline: prove the first deploy's change set offline, leave unverifiable secret parameters out so the stack keeps its live values, guard against creating the stack, and derive the permission ask call by call."
metadata:
  type: project
---

**Rule:** when a new pipeline takes over a stack another pipeline deployed, the first
deploy must change only what the move changes, and every request to the platform team
must be backed by a call that deploy actually makes.

**Why:** 2026-11-17, work repo (service moved into a monorepo, same stacks):
- Secret parameters came from the old CI's hidden variables; SSM copies existed but nobody
  on the team could decrypt them to compare. A NoEcho parameter shows `****` in a changeset,
  so a wrong value would ship invisibly. Leaving them out keeps the live value
  (`sam deploy` sends UsePreviousValue for every parameter not passed).
- Those parameters defaulted to `''`, so the same omission on a NEW stack would deploy empty
  secrets: the script refuses unless the stack already exists.
- Translating old and new templates with SAM's own translator, offline, showed 78/78
  resources and only 20 functions changed (2/2 planted faults caught). That turned a 10-item
  permission wishlist into 5 asks plus 3 SSM reads, and found the one real gap (a second
  template transform the role didn't allow).

**How to apply:**
1. Diff the translated templates (`samtranslator` from the SAM CLI's own python, fake code
   URIs) before writing any infra ask; plant one table and one API change to prove the diff.
2. List every call: your scripts, `sam deploy` (package + changeset), CloudFormation on
   execute. Check the stack's own `RoleARN` (None = CFN acts with the deployer role).
3. Leave out parameters you cannot verify; guard on stack existence; record it as a
   deliberate deviation in the PR.
4. Compare the deploy command for every other project before/after with fake `aws`/`sam`
   on PATH in a throwaway copy (byte-identical argv = no regression).
5. After prod: archive the old repo and stop its CI project (old CI can still rerun deploys).

**Signal:** "the pipeline takes over the existing stacks", "in place, no blue/green", an OPS
or platform permission ask, secrets living in the old CI's settings.
**Next time:** run steps 1–2 before drafting the ask; the ask lists only calls in the matrix.
