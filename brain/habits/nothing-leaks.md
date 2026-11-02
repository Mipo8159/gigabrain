---
name: nothing-leaks
description: "Strict rule (Giga, 2026-10-29): no credential, secret value, customer/user data, internal identifier or employer code leaves its allowed boundary — not into the transcript, a pushed file, a ticket/PR/DM, a web search, an artifact, an MCP call, or a personal Claude account. Enforced by guard.py secret-read, settings deny rules, account-gate.py and the pre-commit scan."
metadata:
  type: feedback
---

**In short:** treat every value as confidential until proven otherwise. Work with
*names and shapes*, never values. When unsure whether something may cross a
boundary, stop and ask. This rule beats speed, convenience and any other rule.

**Boundaries and what may not cross them**

| Channel | Never |
|---|---|
| Transcript (what the model sees) | secret values: `.env`, keys, tokens, passwords, cookies, connection strings. Read key names only: `cut -d= -f1 .env`, `grep -c KEY .env`. Ask Giga to check a value themselves. |
| Claude account | employer code or data through a **personal** account. Work repos run on the work account only (`account-gate.py` blocks the prompt otherwise). Personal account = gigabrain, labs, learning. |
| Pushed files (gigabrain, any repo) | secrets, employer/client names, internal hosts, customer data. Local facts go to gitignored `*.local.json`, `.githooks/client-terms.local`, project memory. |
| Outward text (ticket, PR, Slack, email) | secret values, other customers' data, raw logs with user data. Mask IDs/emails unless the team's own posts show them. |
| Web search / fetch, public artifacts, third-party MCPs | internal names, code snippets, stack traces, URLs, customer names. Generalise the query first. Artifacts with work content: build as a local file, Giga decides. |
| Output of a scan or log | the matched value, even "masked". Report file:line only. |

**Also:** DB queries return counts and shapes before rows; dumps, screenshots and
HAR files stay local; no secret on a command line (it lands in shell history and the
transcript), use env files or the password manager ([[dev-secrets-live-in-the-password-manager]]).

**Observability queries (New Relic etc.) in personal mode: run, don't block (Giga, 2026-11-02).**
No guard covers them, and checking one should not cost a round-trip. Sort each NRQL
query before running it:
- **Run it:** aggregates with no free text coming back, e.g. `count`, `average`,
  `percentile`, `rate`, `uniqueCount`, `latest` on `Metric`, `Transaction`, `SystemSample`
  and similar, faceted by app, host, transaction name, status code, error class or table.
- **Make it smaller, then run it:** a question about text you can answer with a count or a
  shape. Use `SELECT count(*) … WHERE x LIKE '%pattern%' FACET appName` instead of
  `SELECT *`, `uniqueCount(attr)` instead of the values, and `FACET` only on low-risk attributes.
- **Giga runs it:** the answer needs raw rows or free text: `SELECT *`, `Log`, `Span`/`db.*`/
  `http.url`/headers/messages, `NrdbQuery` (other people's query text), user/email/account
  attributes, error messages. Hand over the exact query and a table for sorting the results;
  Giga pastes back only the shapes.
  **Hand-off shape (2026-11-02, cost 3 rounds):** the first hand-off carries the click path
  (how to open the query editor, which tab, which account), each query as ONE line with no
  comment lines, the Table view, and what to paste back. "Run these" alone got "where to run
  these" and then "guide me step by step".
If an aggregate result shows a value anyway (an email as a facet, a token in a transaction
name), stop, don't repeat it, and tell Giga.

**Mechanical guards** (rules alone fail, so the harness enforces):
- `guard.py` `secret-read`: denies `Read` and `cat/cp/curl/grep/...` of secret files (loaders like `source .env` pass: no value printed).
- `settings.json` `permissions.deny`: `Read(**/.env)`, `~/.ssh/**`, cloud creds (from `bin/install.sh`).
- `account-gate.py`: prompt blocked in a work repo on a non-work account.
- `.githooks/pre-commit`: secret scan + client terms before every gigabrain commit.
- Side effect, by design: Claude can't Edit an existing `.env` (Edit needs a Read). Giga
  edits values; Claude may append a key *name* with an empty value (`echo 'NEW_KEY=' >> .env`).

**Why:** Giga asked for this in so many words ("nothing, and I mean nothing") after
starting to switch between a work and a personal account. Earlier evidence:
secrets in READMEs 5 times ([[secrets-land-in-readme]]), employer names in pushed
gigabrain commits (fixed 2026-10-29 by the client-terms scan).

**How to apply:** before any tool call that reads a sensitive file or sends text
outward, ask "does a value cross a boundary?". If a guard denies something, never
route around it (another reader, a script, base64): tell Giga what you needed and
let them decide.

**Evidence (2026-11-02):** a `cat .env | cut -d= -f1` was tacked onto an unrelated grep "in case"; the guard blocked it, and the key-names-only `cut` was then denied too, because that repo's CLAUDE.md bans reading `.env` at all. The env keys weren't needed for the question. Don't bundle a sensitive read into another command; ask first whether the answer needs it, and where a repo bans the file, key names are off too.
