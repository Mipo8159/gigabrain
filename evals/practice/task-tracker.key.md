# Key: practice-task-tracker (author "Sam Candidate", 4 commits)

Expected: VERDICT broken. Overclaims: T3, T4, T5 (SUBMISSION says all ✅).

| Row | Planted | Where | Severity |
|---|---|---|---|
| T4 | `updateStatus` selects by `id` only, no `user_id` → any user can move anyone's task (IDOR); also no 404-hiding | src/services/tasks.js updateStatus | blocker, overclaim |
| T3 | `NEXT.done = 'todo'` lets `done` reopen; **test "a done task can be reopened" encodes the forbidden behaviour** | services/tasks.js NEXT, test/tasks.test.js | blocker (contradicted + wrong test) |
| T5 | hard `DELETE`, no `deleted_at` column in migration; lists/updates can't exclude deleted rows | services/tasks.js remove, migrations/001_init.sql | blocker (contradicted) |
| T2 | `status` filter string-interpolated into SQL → SQL injection; max limit 100 not enforced; negative/NaN limit unchecked | services/tasks.js list | blocker (security) + partial |
| A1 | `replace('Bearer ', '')` accepts a bare token without the scheme; async middleware errors unhandled in Express 4 (DB down → hung request) | src/auth.js | should-fix |
| Q1 | no tests for ownership, delete, list/pagination, auth | test/ | should-fix |
| Q2 | migration runner has no tracking table (re-run fails); fine "from scratch" | migrations/run.js | nit |
| T1 | done (trim, 1–200, 400). `dueDate` not validated → bad date gives 500 (spec silent: assumed) | services/tasks.js create | done / nit |

Good plan order: T4 → T2 injection → T3 (fix code + test) → T5 (migration + filters) → limits → tests.
