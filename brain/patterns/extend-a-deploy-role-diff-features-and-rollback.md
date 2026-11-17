---
name: extend-a-deploy-role-diff-features-and-rollback
description: "Adding a new service to an existing CI deploy role: copy the siblings' pattern, then diff the new template's features against theirs and give the role read access to the artifacts the current deploy came from, or a failed first deploy can't roll back"
metadata:
  type: feedback
---

**In short:** a deploy role built for one family of services, extended to a new one
by copying its patterns, misses whatever only the new service uses. When the stack has
no CloudFormation service role, CloudFormation acts *as the deploy role*, rollback
included.

**Why:** 2026-11-17, a role extension for the first non-sibling service in a monorepo.
Copying the siblings' grants passed every name check. Two independent reviews then
found three gaps no sibling deploy had ever exercised:
- the template used a transform no sibling used (needs its own CreateChangeSet grant);
- one function set reserved concurrency (Put/DeleteFunctionConcurrency), which no sibling did;
- the artifact prefix changed with the move. Lambda reads code from S3 with the caller's
  credentials, so a failed first deploy rolls back by reading the *old* prefix. Without read
  access there, the stack ends in UPDATE_ROLLBACK_FAILED. The siblings were all fresh stacks
  that had never rolled back to another prefix, so precedent couldn't show this.

**How to apply:**
- List the new template's resource properties and transforms; grep the siblings' templates
  for each one. Every property found in 0 siblings is a permission nobody has tested.
- Walk the rollback as well as the deploy: what does undoing each changed resource read?
- Grant the old artifact location read-only, in its own statement, with a removal note.
- Prove it offline: resolve the policy for each stage, match the real names, include
  negative cases and planted faults (one per dimension: resources *and* actions).

**Signal:** "same way it deploys the X stacks today", a first migrated service of a new kind,
or an artifact path/prefix that changes with the move.
**Next time:** run the property diff and the rollback walk before writing the ask, not after review.

Related: [[prove-a-permission-revoke-by-diffing-effective-access]], [[map-each-step-to-playbook-and-precedent-first]], [[a-test-must-be-able-to-fail]].
