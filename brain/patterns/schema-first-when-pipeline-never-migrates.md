---
name: schema-first-when-pipeline-never-migrates
description: When deploys don't run migrations, even an additive column breaks the new code, because the ORM selects every mapped attribute. Migrate the target env before (or with) the push, and say so in the handover.
metadata:
  type: project
---

**Rule:** a schema change in a repo whose deploy never migrates is shipped in
two steps: migrate the environment, then push. Put the order at the top of the
handover, not in a footnote.

**Why:** an added column with a default is safe for *old* code but fatal for
*new* code: the ORM model lists the column, so every `SELECT` on that table
fails until the migration runs. In one work repo (2026-10-30) that table fed
the home and channels pages, so a push-before-migrate would have broken
both. The same repo earlier hit missing GRANTs and ownership errors for the
same reason (the schema on shared envs lags the code).

**How to apply:** for any migration in the diff, check whether CI/CD runs it.
If not: name the migration, the env, who runs it (an env write is ask-first),
and any post-deploy data step (e.g. an admin flag).

**Signal:** a new file under `migrations/` + "pushing to main deploys".
**Next time:** the first line of the handover is the deploy order.
