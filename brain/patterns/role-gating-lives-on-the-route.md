---
name: role-gating-lives-on-the-route
description: "\"Only role X may change field F\" is enforced by the server route, never by hiding a UI control; a shared update endpoint that accepts privileged fields lets lower roles escalate"
metadata:
  type: project
---

**In short:** a role restriction lives on the server route that writes the field, not in
the UI. Check every route that can write it, including the one that sets
`role`.

**Evidence (2026-10-02):** asked to let only the top admin role change a user
field in the admin panel. The backend already accepted it on a generic
`PUT /users/:id` the lower admin role could call, so a UI-only check would have
changed nothing. That endpoint also accepted `role`: a lower admin could
promote themselves and reach the "protected" route anyway.

**Rule:** read the role guard on every route that writes the field. If a
broader role can reach it, fix it on the server:
1. Give the privileged field its own route, with the narrow role guard.
2. Remove the field from the shared update schema. If the validator strips
   unknown keys (zod `z.object`, class-validator `whitelist`), a lower role's
   attempt is silently dropped. Confirm the global validation pipe really strips.
3. Check `role` itself the same way. A privileged field is only as safe as the
   path to the privileged role.

**Proof:** a lower-role token gets 403 on the new route, and the field sent to
the shared route leaves the DB value unchanged.

Related: [[giga-wants-argued-recommendations]]
