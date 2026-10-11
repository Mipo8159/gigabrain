# Prompt log: before → after → why

Real prompts, rewritten. `/curate` appends `prompt-lesson` candidates here.
The goal is to *see* your own patterns change over the months.

---

### 2026-10-01: Debugging (seeded from history)
- **Before:** "help me fix this" + 51 pasted lines
- **After:** "Expected the course list to load; it 500s since yesterday's
  migration. Error below. I suspect the new `creatorId` FK. Reproduce it
  first, then fix."
- **Why:** expected/actual + what changed + a hypothesis cuts the search space
  from "anything" to "check one thing first".

### 2026-10-01: Feature request with no proof
- **Before:** "add another endpoint … compare the header with the active version"
  → later "is everything set?"
- **After:** same spec + "Done when: a curl with an older x-app-version returns
  `updateRequired: true`, with a newer or equal one `false`, and the migration
  has run locally. Show me both curls."
- **Why:** "is everything set?" asks Claude to grade its own homework. A
  done-criterion makes it prove the work.

### 2026-10-01: Learning lab
- **Before:** "step 1"
- **After:** "Step 1, outbox, tutor mode. I write the relay. Give me the
  failing test and the table; hints only when I ask."
- **Why:** the first version gets you code to read; the second gets you a
  skill you can use.

### 2026-10-02: Feature with late constraints
- **Before:** "the coinAmount coming from client side is in euros … rate 1 = 10 …
  if nothing is provided it sits as null … help me roll out the agents" → two
  turns later: "we don't need this conversion on migration level, the feature is
  a few days old, and not on prod"
- **After:** "In core, external-content create/update: client sends coinAmount
  in EUR; store coins = round(eur × 10); responses in EUR; null → free lesson on
  approve. No data migration: not on prod. Done when: €4.99 stores 50, null stays
  null, tsc clean. Use build-loop; reviewer before handover."
- **Why:** constraints you already know ("not on prod") remove whole branches of
  work; stating them first cost one question instead of a built-and-deleted
  migration.

### 2026-10-01: State the end goal in the first message (from inbox)
- **Before:** "explain what AI setup we have" → "plan" → "fresh start, rate me,
  maximise Claude"
- **After:** "Goal: maximise how I use Claude and track my growth. First rate my
  current usage from history, then propose a repo to hold it. Keep answers short."
- **Why:** two answers went to goals the third message superseded.


### 2026-10-02: Bug report missing the facts that decide it
- **Before:** "QA can't update the external content, began when I started wrapping the
  returned URL with the CDN … for a 30 minute video admin panel does not show anything,
  AWS says key not found. diagnose, analyze, plan and resolve"
- **After:** "SDQA, submissions 44/46: PUT returns 500 since the CDN wrapping (expected 200).
  A 30-min upload opened in admin right after submit shows NoSuchKey; a 20-s one plays.
  I suspect the signed URL. Access ready: SSO fresh, VPN on. Done when both work on SDQA.
  Split it: logs in background, admin fix in a worktree."
- **Why:** "what changed" was the best part and found bug 1 fast. IDs, the exact error and
  "right after submit" would have removed about 10 tool calls of searching, and stating
  access up front avoids dead ends mid-investigation.

### 2026-10-02: "Done when" that can't be checked, and a scope that hid the real gap
- **Before:** "check admin repository, add the changes to admin side that allows SUPER_ADMIN role
  user to change the user grade … done when: admin can successfully change user grades without
  any issues. use agentic workflow"
- **After:** "Let only the top admin role change a user's grade (all enum values). Check where it's
  enforced, admin and core. Done when, on local core (I'll run it on :3010, login in
  `.env.local`): the top admin sets all 4 grades via the UI, the DB matches, and a lower admin gets
  403. Background reviewer before handover."
- **Why:** "admin side" was the wrong layer: the server let the lower role write the field, so a
  UI-only fix would have passed the stated criterion and still been open. "Without any issues"
  named no environment, user or check, and missing access (core not running, no login) pushed the
  live proof into a second round.

### 2026-10-02: "analyze following" vs. a question with a decidable done-criterion
- **Before:** "analyze following" + a pasted ticket (then a steer: "not too long").
- **After (Giga's own second prompt, good):** "check if backend plays any decisive role …
  definition of done is the definitive answer whether this could be achieved from the backend side"
- **Why:** the first prompt left the deliverable open, so the answer covered infra, mobile and
  backend broadly. The second named one yes/no question and what counts as done. That got a
  firm answer with its reasoning in one round.

## 2026-10-02: build prompt with a decidable, counted done (good)
- **Prompt:** "define done, when user gets push notification sent when admin approves or rejects … if 2 rejects and 1 approval, 3 push notifications should be sent to the creator."
- **Why it worked:** a concrete example with a count turned "notify on review" into a test
  (3 jobs for 3 reviews, 409 → no 4th). It drove the jobId-per-entity design and the local proof.
- **Still missing:** env and access ("local Docker; no real device token; QA env after push").
  That came 3 prompts later and cost an extra verification round.

## 2026-10-03: a long autonomous delegation (good scope, missing boundaries)
- **Before:** "spend some more time, somewhere around 20-30 minutes, to reanalyze everything the ECC
  repository does and absorb every precious detail into gigaforge … until we are left with a kit
  that is easy to use and adjust to all the existing projects."
- **After:** "Absorb ECC's architecture into gigaforge as a kit for my projects. Done when: `kit
  apply` works on a scratch clone and `kit doctor --all` is clean. Budget ~30 min. Allowed: edit
  and test inside gigaforge + temp dirs. Not allowed without asking: other repos, ~/.claude,
  commits, pushes."
- **Why:** the goal and the time budget were clear, and the run was autonomous as wanted. But with
  no done-line or action boundary, Claude chose both. It stopped twice to hand back outward actions
  (install, other repos), and the session ran far past the budget while review passes kept finding
  issues. A boundary line turns "may I?" stops into decisions made up front.

## 2026-10-04: a "make it region bound" request (good done-line, missing scope + access)
- **Before:** "when external content is created it should be created within the region scope … analyze,
  plan and execute the changes, definition of done is the regionally separated external content for
  admin to review and the reel or lesson created from them on approval." (Two prompts later: "that should
  also include the course creation … my-channel should create them in user region".)
- **After:** "Make external content region-bound across every entry point: submit, my-channel create,
  admin list/get/approve/reject, reel/lesson on approve. Done when: a local run shows each admin region
  sees only its rows, and a mismatching X-Region-ID still stores the user's region. Access: SSO valid,
  local admin login <x>. Report what already holds before changing anything."
- **Why:** the done-line was decidable, which is progress. But the entry points arrived one at a time, so
  the proof ran twice, and the expired SSO and missing admin login cost a round-trip. Most of the
  feature already existed, so "report what already holds" turns a build into a gap check.

## 2026-10-05: "build me an exporter" (good goal, no done-line, no access plan)
- **Before:** "help me create a framework-like code, that regenerates new csv bundles needed for CRM imports… on run fetches all the data + fresh ones… each consecutive run should fetch all the new rows… run on command and on cronjobs."
- **After:** "Build an incremental exporter: both ERP DBs → one CSV bundle per run (stores, sellers, products, contacts, card-receipt deals, items, store-day totals). Done when: offline tests pass, a live backfill's counts match the DB, an immediate rerun emits 0 rows, and store-day revenue equals payments per store for one day. Personal data behind a flag; history from 2025-01-01. Access: VPN up (drops ~50 min). Allowed: read-only queries, local files; ask first: anything on the server."
- **Why:** Claude had to ask 4 option questions and write the proof list itself. The VPN drop cost two waits. Stating done, scope and access up front turns that into zero questions.

## 2026-10-05: "find more repos like ECC" (rich goal, no done-line or output shape)
- **Before:** "could you search for more of such repositories … adept in AWS, message brokers, horizontal scaling, system design, DDD, databases, nodejs, kubernetes … list the best ones, which we can clone and learn from … with visualization and sample project generation." Next prompt: "please make a list of these repos and put them in one readme file, alongside the plan."
- **After:** "Find repos like ECC for <topics>. Done when: a README in library/candidates/ lists ≤5 to absorb, plus repos to clone and to read, each with stars, last push, licence and the exact subset to take, plus the gaps no repo fills and a phased plan with a proof per phase."
- **Why:** the topic list was excellent. The missing output shape cost a second prompt, and the missing licence criterion left Claude to discover that the most attractive skills had no licence.

## 2026-10-05: "plan ahead … move me to perfection" (good ambition, uncheckable goal)
- **Before:** "plan ahead, to guide me with hints and appropriate suggestion on how better utilize claude along the way, in order to cover up and fill all the gaps which now exists. constantly evaluate and keep track of my interraction and try to move me to the perfection"
- **After:** "Turn the gaps from your assessment into a roadmap at ~3 h/week. Done when: me/roadmap.md lists each gap with a due date and a proof, the coach hook shows the current step every session, and /retro moves it. Use the existing scorecard for tracking, no new tracker. Targets: scorecard dims, not 'perfection'."
- **Why:** "perfection" and "constantly evaluate" can't be checked, so Claude had to invent the targets and ask 4 questions (pace, plugin go/no-go, coaching strength, domains). Naming pace and tracking place up front leaves only the real decisions to ask.

## 2026-10-05: "new channel should be isPublished:true out of the box" (clear, missing reach)
- **Before:** "help me fix on more thing. when user creates his own channel via my-channel endpoint, it should be isPublished:true out of the box"
- **After:** "New creator channels start isPublished:true. Existing unpublished channels: backfill yes/no (local only; SDQA ask first). Empty channels in public lists: OK / hide until first lesson. Done when tsc + eslint are clean."
- **Why:** the change was one line and needed no questions. But a default flip always raises two more decisions: rows that already exist, and what becomes visible. Claude had to hand both back as open questions at the end.

## 2026-10-06: "generate a new nestjs project … step by step" (rich goal, three tasks, no done-line)
- **Before:** "please generate a new nestjs project, all is missue, this project should be split and evolved piece by piece … users, issues, audit-logs, search, analytcs, devices … Nestjs, kafka, sagas, postgres, elasticsearch … grpc for auth checks, clickhouse … another goal is to improve our gigaforge, which should definately be onboarded … teach me how to write better promps along the way"
- **After:** "New Nest lab `newEra/tracker`, Jira domain, stack: <list>. Monolith first, one pattern per step, animated artifact per step. I write each step's core; you scaffold, test, visualise. Step 0 done when: compose + e2e green, an invalid transition returns 409, the artifact is published, kit doctor clean. ~3 h/week. issue-flow: delete after porting. Ask first: anything outside the repo."
- **Why:** the stack and domain were complete, so one question batch was enough. Missing were the done-line, who codes, the pace, and the repo name. "all is missue" was unreadable, and issue-flow was deleted before anything could be ported from it.

