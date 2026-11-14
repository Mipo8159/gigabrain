---
name: check-dev-server-datasource-before-writes
description: Before HTTP-testing writes against a dev server someone else started, check which DB host the process is actually connected to (ss -tnp on its pid). Env files often point at a shared or remote DB, not local Docker.
metadata:
  type: feedback
---

**Rule:** before any write request (POST/PATCH/DELETE, or a migration-dependent
read) against a dev server Giga started, look at the process's open sockets:
`ss -tnp | grep "pid=<pid>"`. Proceed only if the DB peer is the local
container you expect. Otherwise stop, report the host, and give Giga the
inline overrides for local.

**Why:** in a work repo (2026-11-14) Giga started the API for an E2E test
right after an SSO login. The first GETs returned 500 and one hung. Its only
Postgres connection went to a private remote address, not the local
local container the migration was applied to: the app's env file pointed
elsewhere. The 500 was the unmigrated column. Any create/delete test would have
written to that remote DB. The repo's migration guard protects the CLI, not
the server process.

**How to apply:** first GET only after the socket check; read the env file only
if allowed; never send writes on an unverified datasource. Name the guess
(shared dev or production?) as a guess.

**Signal:** "X running, test it", a fresh SSO/VPN session, a repo whose env
file is known to point at shared DBs.
**Next time:** `ss -tnp` on the server pid is the first command of any E2E
session, before the token request.
