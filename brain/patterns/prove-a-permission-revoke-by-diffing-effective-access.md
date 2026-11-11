---
name: prove-a-permission-revoke-by-diffing-effective-access
description: "Before a migration that removes a permission/policy ships, prove its exact blast radius: snapshot every role's effective permissions before and after on a throwaway DB at prod's migration state, diff them, probe the real access API for the revoked and neighbouring resources, and show rollback restores byte-identical state."
metadata:
  type: feedback
---

**In short:** "the migration only removes X" is a claim; a before/after diff of
*effective* permissions for every role is the proof. Pair it with "no caller"
evidence from code and traffic.

**Why:** 2026-11-10, work repo. A sibling migration a week earlier revoked a
permission that a live code path still needed, and staging project creation
broke until someone restored rows by hand. For the next revoke the human was
(rightly) worried. Row counts and a green up/down test didn't settle it: the
policy turned out to sit on live human roles (not the dead token roles the code
comment claimed). What settled it in ~36 s, rerunnable: effective-permission
dump for 84 roles at prod's migration state, 5628 → 5624 lines, the only 4
removed lines being the intended route; the real HTTP access API answering
ALLOW→DENY for the revoked route and ALLOW→ALLOW for 6 neighbouring resources
that share the same variable; rollback byte-identical. Plus: 0 callers in a
75-repo sweep and 0 requests in tracing. The deploy then went out clean.

**How to apply:**
1. Throwaway DB matching prod's engine/version, migrated to the last migration
   before yours (= prod state). Seed one child role per base role if roles
   inherit.
2. Dump effective permissions with the service's own resolution logic (reuse
   its SQL/functions, including inheritance), sorted, to a file. Run the
   migration, dump again, `diff`. Anything beyond the intended lines = stop.
3. Start the service locally and call the access endpoint real callers use,
   for the revoked resource and 4–6 neighbours (same variable, same roles).
4. Roll back, dump, `diff` against "before" → must be empty. Re-apply → equals
   "after".
5. Wrap it in one script that creates and removes its own uniquely named
   containers; rerun it yourself before calling it proven (an agent's last edit
   is untested until you rerun).
6. Separately prove "no caller": org-wide default-branch grep (fresh fetch) +
   traffic counts on the protected route.

**Signal:** a migration that soft-deletes/revokes policies, roles, grants or
statements; "make sure nothing breaks" on an auth change; a previous revoke that
broke something.
**Next time:** offer the before/after effective-access diff as the proof in the
first reply, not after the human pushes back.

Related: [[migration-branch-on-shared-env-blocks-mainline]], [[prove-an-upgrade-breaks-nothing]], [[a-test-must-be-able-to-fail]], [[role-gating-lives-on-the-route]]
