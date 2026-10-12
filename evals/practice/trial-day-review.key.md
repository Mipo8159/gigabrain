# Key: practice-trial-day-review (author "Peter Griffin", 5 commits on `solution/peter-griffin`)

A replica of a real Testlio senior-engineer interview (seen on video, 2026-09-14). Format:
60 min, screen shared, AI encouraged. "Peter is a teammate; review his submission against
README (requirements) and SUBMISSION.md (his claims). Find the maximum, discuss fixes for a
few, implement one or two." Proof the bugs are live: `trial-day-review.verify.sh` (25 rows).

Reconstruction notes: README is verbatim from the video. The planted code matches what was on
screen for `issues.js`, `revisions.js`, `issue-service.js`, `auth.js`, the issue model and the
test header. `index.js`, `routes.js`, the revision model, SQL scripts and the rest of the tests
are rebuilt to fit Claude's findings in the video. O3 (route name) is a guess from those findings.

**Expected verdict:** broken. Tasks 1–3 work on the happy path. Task 4 is half done (F1: every
update stores an empty diff). Task 5 is cosmetic (S1, F8, F9). Task 6 leaks across issues (F2),
and its trail and reverse bonus are wrong (F10, F11). SUBMISSION overclaims "all six tasks",
transactions, the FK, token verification and the route name.

## Business-value order (the interviewer's actual ask)

The interviewer's feedback: *"Find the value and draw a straight line to unlock it. Don't
prioritise by Claude's default."* So rank by **which promised outcome is broken**, then security:

1. **Task 4 broken (F1).** Revisions never say what changed. That's the core feature ("track what
   exactly was changed, by whom and when").
2. **Task 6 wrong data (F2).** Compare mixes other issues' revisions: wrong answers *and* a data leak.
3. **Task 5 not delivered (S1, F8, F9).** Auth accepts any token, X-Client-ID is optional, and the
   author on updates is the client id, not the email. The audit trail can't be trusted.
4. Then the remaining security rows (S4 injection, S2, S7, S3, S5, S6), then F3/F4/F7, F5/F6, F10–F12.

In the video, Claude put security first, treated functional bugs as priority 2 and never mapped
README tasks to status. The candidate followed that and was steered back twice.

## Rows

| Row | Planted | Where | Severity | Found in video? |
|---|---|---|---|---|
| S1 | `jwt.decode` instead of `jwt.verify`, any signature accepted; `config.jwt.secret` never read | lib/middleware/auth.js | blocker (Task 5) | Claude 1.1 |
| S2 | `context.url.includes('health')` lets `/issues?x=health` through with no token | auth.js top | blocker | Claude 1.2 |
| S3 | `payload.exp < Date.now()` is seconds vs ms, so it's **always true**: every token with `exp` gets 401, tokens without `exp` never expire | auth.js | blocker | Claude 1.3, **with the wrong reasoning** ("expired tokens pass"). Nobody verified it. |
| S4 | `sort`, `limit`, `offset` interpolated into raw SQL; `sort=id LIMIT 1 #` rewrites the query, `limit=-1` gives 500 | lib/api/issues.js list | blocker | Claude 1.4, candidate |
| S5 | `console.log(... ' with token ' + token)` | auth.js | should-fix | Claude 1.5 |
| S6 | `JWT_SECRET \|\| 'testlio-trial-day-secret'` | config.js | should-fix (interviewer: OK for non-prod) | Claude 1.6 |
| S7 | whole body to `Issue.create`/`issue.update`: client sets `id`, `updated_by`, timestamps | issues.js create/update, issue-service.js | should-fix | Claude 1.7 |
| F1 | `const before = issue` aliases the instance, so `changes` is always `{}` on update | lib/services/issue-service.js update | **blocker (Task 4 core)** | Claude 2.1 |
| F2 | compare filters `id BETWEEN from AND to` with no `issue_id` | lib/api/revisions.js compare | **blocker (Task 6 + leak)** | Claude 2.2 |
| F3 | `respond.notFound` without `return`, falls through to `update(null)`, giving 500 | issues.js update | should-fix | Claude 2.3 |
| F4 | try/catch error middleware mounted **after** the router: never runs, would leak `err.stack` | index.js | should-fix | Claude 2.4 (interviewer asked about it) |
| F5 | `total: issues.length` is the page size | issues.js list | should-fix | Claude 2.5 |
| F6 | `Revision.count` per listed issue (N+1) | issues.js list | nit/should-fix | Claude 2.6 |
| F7 | `GET /issues/:id` unknown returns 200 `{"issue":null}`; `data ? 200 : 204` is dead code | issues.js get, responses.js | should-fix | Claude 2.7 |
| F8 | X-Client-ID read but never required | auth.js | **blocker (Task 5 spec)** | **missed by both** |
| F9 | `updated_by = context.headers['x-client-id']`, not the author's email | issues.js update | **blocker (Task 5 spec)** | **missed by both** |
| F10 | `from > to` returns `[]`, so 404; reverse comparison (bonus) unsupported | revisions.js compare | partial | Claude 2.8 |
| F11 | `revisions: slice(1, -1)` drops both endpoints, so it isn't "the full trail between A and B" | revisions.js compare | partial (Task 6) | Claude 2.8 |
| F12 | diff only over `Object.keys(after)` (removed fields missed) and includes id/timestamps (noisy); list returns `changes` as a JSON string | revisions.js | should-fix | Claude 2.8 (partly) |
| O1 | SUBMISSION: "`revisions.issue_id` has a foreign key"; 02-revisions.sql has none | docker-entrypoint-initdb.d | overclaim | missed |
| O2 | SUBMISSION: "all database writes are wrapped in a transaction"; no transaction anywhere | issue-service.js | overclaim + data consistency | missed |
| O3 | SUBMISSION documents `/issues/:id/revisions/compare`; real route is `/issues/:id/compareRevisions` | routes.js | overclaim (docs) | missed |
| T1 | tests sign with `'some-other-secret'` and pass **only because of S1**; fixing S1 turns them red | test/issues.test.js | should-fix | missed |
| T2 | "lists the issues" sends no X-Client-ID and expects 200; tests need a live server; compare test hard-codes `from=1&to=2` | test/issues.test.js | should-fix | missed |
| — | no migrations (init scripts only run on a fresh volume); no revision for who *created* beyond `created_by` | — | nit | — |

## Self-run script (45 min, out loud, like the interview)

1. **0–5 min:** `git log --stat`, then build a table: README task → SUBMISSION claim → file. No AI yet.
2. **5–20 min:** for each task, *run it*: `docker compose up -d`, curl create → patch → revisions → compare.
   F1 and F2 show up within a minute of doing this.
3. **20–30 min:** AI pass with the table as the spec (e.g. `/intent-review audit README.md claims=SUBMISSION.md`).
   Check each AI claim against a curl before repeating it (S3 is the trap).
4. **30–45 min:** answer the interviewer's questions, then fix F1 or F2 with a test that fails first.

Interviewer questions to answer cold:
- "Other than JWT and SQL injection, what else?" (go straight to F1, F2, F8, F9)
- "Propose the fix for the SQL injection." (whitelist `sort` column and direction, parse/clamp `limit`/`offset`, use `findAndCountAll`)
- "Is there generic error handling? Where would you add it?" (index.js: it exists but sits after the router; move it first, return `{message}`, log the stack)
- "How would you fix the error handler?" (as above, plus `app.on('error')`, and map Sequelize validation errors to 400)

Score: rows found with the correct status, false alarms, and whether the plan put F1/F2/Task 5 first.
