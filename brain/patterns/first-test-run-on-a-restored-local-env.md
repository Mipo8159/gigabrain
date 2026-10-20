---
name: first-test-run-on-a-restored-local-env
description: "The first time a service's tests run in a compose env built from a shared DB dump, expect three hidden gaps: the source bind-mount hides the image's node_modules, the dump has only *_dev databases (no *_test), and the dump's DB system tables are from an older server version (CREATE EVENT fails 'event scheduler is disabled'). Fix each, then take a green baseline before changing code."
metadata:
  type: project
---

**In short:** before touching code in a new local env, get the existing test
suite green on an unchanged checkout. Getting there exposes the env's gaps once;
after that, any red is yours.

**Why:** 2026-10-20, preparing a dependency upgrade in one service of a
~50-service compose env, three blockers appeared in sequence:
1. `sh: knex: not found`: the service bind-mounts its source over the app
   dir, hiding the `node_modules` built into the image, and the host clone had
   none (its install had failed earlier).
2. `Unknown database '<svc>_test'`: the team dump ships only `_dev` databases.
3. `CREATE EVENT … Cannot proceed, because event scheduler is disabled`, even as
   root, with `@@event_scheduler` = OFF. The server log had the real cause:
   `Incorrect definition of table mysql.event … Disabling the Event Scheduler`.
   The dump came from an older MariaDB, and the container skipped
   `mariadb-upgrade` (auto-upgrade not set).
   A first failed migration also left a half-built test DB (table created,
   event not), so the rerun failed differently.
After fixing all three: 31 migrations, 170 passing, a clean baseline.

**How to apply:**
1. Install deps *through the container* into the mounted clone
   (`run --rm --no-deps -e NPM_TOKEN --entrypoint npm <svc> install`), then revert
   lockfile churn caused by a different npm version.
2. Create the `_test` DB yourself; then run migrations in the test container.
3. On a strange DB error, **read the server's own log** (`docker-compose logs <db>`)
   before guessing. For version-mismatch errors run `mariadb-upgrade` (or
   `mysql_upgrade`) in the container, then restart it (ask first).
4. After a failed migration, drop and recreate the *test* DB before rerunning.
   Never do this to the dev DB.
5. Record the recipe in the project's CLAUDE.md, and tell the team: every new
   developer hits the same gaps.

**Signal:** first `<svc>-test` run in a freshly set-up env, or a DB error that makes no sense for the user/privileges you have.
**Next time:** install through the container → create `_test` → read the DB log → baseline before the change.
