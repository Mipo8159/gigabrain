---
name: role-gating-lives-on-the-route
description: "\"Only role X may change field F\" is enforced by the server route, never by hiding a UI control; a shared update endpoint that accepts privileged fields lets lower roles escalate"
metadata:
  type: project
---

**Evidence (2026-10-02):** asked to let only the top admin role change a user
field from the admin panel. The backend already accepted the field on a generic
`PUT /users/:id` that the lower admin role could also call. A UI-only check
would have looked done and changed nothing. The same endpoint also accepted
`role`, so a lower admin could promote themselves to top admin and then get the
"protected" route anyway.

**Rule:** before building a role-restricted control, read the role decorator
or guard on every route that writes that field. If the write is reachable by a
broader role, the fix belongs on the server:
1. Give the privileged field its own route, with the narrow role guard.
2. Remove the field from the shared update schema. If the validator strips
   unknown keys (zod `z.object`, class-validator `whitelist`), a lower role's
   attempt is silently dropped. Confirm the global pipe really strips.
3. Check `role` itself the same way. A privileged field is only as safe as the
   path to the privileged role.

**Proof:** a lower-role token gets 403 on the new route, and the field sent to
the shared route leaves the DB value unchanged.

Related: [[giga-wants-argued-recommendations]]
