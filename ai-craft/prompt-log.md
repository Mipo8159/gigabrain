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
- **After:** "QA, submissions 44/46: PUT returns 500 since the CDN wrapping (expected 200).
  A 30-min upload opened in admin right after submit shows NoSuchKey; a 20-s one plays.
  I suspect the signed URL. Access ready: SSO fresh, VPN on. Done when both work on QA.
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
  repository does and absorb every precious detail into gigabrain … until we are left with a kit
  that is easy to use and adjust to all the existing projects."
- **After:** "Absorb ECC's architecture into gigabrain as a kit for my projects. Done when: `kit
  apply` works on a scratch clone and `kit doctor --all` is clean. Budget ~30 min. Allowed: edit
  and test inside gigabrain + temp dirs. Not allowed without asking: other repos, ~/.claude,
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
- **After:** "New creator channels start isPublished:true. Existing unpublished channels: backfill yes/no (local only; QA ask first). Empty channels in public lists: OK / hide until first lesson. Done when tsc + eslint are clean."
- **Why:** the change was one line and needed no questions. But a default flip always raises two more decisions: rows that already exist, and what becomes visible. Claude had to hand both back as open questions at the end.

## 2026-10-06: "generate a new nestjs project … step by step" (rich goal, three tasks, no done-line)
- **Before:** "please generate a new nestjs project, all is missue, this project should be split and evolved piece by piece … users, issues, audit-logs, search, analytcs, devices … Nestjs, kafka, sagas, postgres, elasticsearch … grpc for auth checks, clickhouse … another goal is to improve our gigabrain, which should definately be onboarded … teach me how to write better promps along the way"
- **After:** "New Nest lab `newEra/tracker`, Jira domain, stack: <list>. Monolith first, one pattern per step, animated artifact per step. I write each step's core; you scaffold, test, visualise. Step 0 done when: compose + e2e green, an invalid transition returns 409, the artifact is published, kit doctor clean. ~3 h/week. issue-flow: delete after porting. Ask first: anything outside the repo."
- **Why:** the stack and domain were complete, so one question batch was enough. Missing were the done-line, who codes, the pace, and the repo name. "all is missue" was unreadable, and issue-flow was deleted before anything could be ported from it.


## 2026-10-12: "build the audit mode … read requirements, and potential submission or claim file … give out suggestions"
- **Before:** "allright, buld the audit mode, I need to have the abiliy to analyze and plan accross codebase. read requirements, and potential submission or claim file … then plan ahead and analyze what is going on and give out suggestions around it."
- **After:** "Build audit mode for intent-reviewer: whole repo + requirements file + optional claims file → status per rule with file:line, overclaims, ranked fix plan, no fixes. Done when bin/eval-intent passes the old 7 cases plus one new audit case. Budget: ≤10 agent runs (I'm on Pro)."
- **Why:** the scope was clear and Claude had already proposed the proof one turn earlier, but the prompt didn't adopt it, so the done-line and the run budget (which mattered after the usage question) were Claude's guess.

## 2026-10-12: "help me improve the gigabrain … use claude AI to its best capacity" (goal without target)
- **Before:** "help me improve the gigabrain by adding more features to it, or by expanding its knoweledge. the goal is to use claude AI to its best capacity"
- **After:** "Do the roadmap `Now:` step (phase 1: plugin scoping). Done when `claude plugin eval` is green for the core skills and a Nest repo lists no homelab skills. Budget 2 h, install allowed, ask before touching other repos. Retire: network/homelab/seo; opt-in: media, content."
- **Why:** "more features or more knowledge" points the wrong way. 52 library entries were still unproven, and the gaps scored 0 were habits, not knowledge. The roadmap already named the next step, and the coach hook injects it into every prompt. Claude spent one turn steering back to it plus a 4-question batch.

## 2026-10-13: "keep the work going all night … make gigabrain adept in visualizations" (overnight delegation)
- **Before:** "yes, keep the work going all night, I am going to sleep. if token limit will be reached, just pause till they resume. … also make gigabrain adept in visualizations, explanations and creating teaching platforms with neat diagrams"
- **After:** "Overnight, unattended. Tracks: (1) process/CORE evals with ablation, (2) teach skill + one lesson per domain. Done when: each track's results are in NOTES.md plus a cut-list in inbox/, and every lesson passes a headless render check. Never commit, push or publish. On a usage limit, pause. Report: inbox/morning-report.md with the decisions I need to make."
- **Why:** it was a good delegation: clear authority, a rule for limits, and Giga stayed out of the loop. But "adept in visualizations" had no proof, so Claude defined the checker itself. Naming the report file and the "decisions for me" section up front also makes the morning handover predictable.

## 2026-10-14: "enrich the learnings with more modern diagrams … all of my lessons … 2026 standards" (build + research in one line)
- **Before:** "could you enrich the learnings with more modern diagrams and also start better explanations and add more interractions. is tehre any known skill or repository out there that is already doing this? I want all of my lessons to be as comprehensible from start to finish and up to 2026 standarts as possible"
- **After:** "First: is there an existing skill/repo for interactive single-file lessons (adopt or borrow?). Then upgrade teach + rebuild all 9 lessons. Done when bin/check-lesson (made stricter: predict-reveal, live figure, steppers with Back, recall, phone) passes on all 9 and I approve kafka. Offline pages, 3 agents at a time."
- **Why:** goal and scope were clear and the research question was well placed up front. "2026 standards" and "comprehensible" had no proof, so Claude had to propose the checker rules and the rollout in a 4-question batch (Giga answered in one go, choosing "all 9 at once").


## 2026-10-14: "something like an exe file … once clicked creates folder with all csv files" (outcome without channel)
- **Before:** "the client should be able to download those data csv files … I need a simple solution, something like an exe file. that when clicked initiates the download process and updates files. folder -> .exe file, once clicked creates folder with all csv files."
- **After:** "Client downloader for a non-technical user. Windows for sure, Mac/Linux nice-to-have. Delivered as a private GitHub repo; I configure server + token in a .env on their PC, they only double-click. Each click pulls fresh data first, then downloads only new files. Done when it works against localhost on my PC, twice in a row (second click: nothing new)."
- **Why:** the outcome was clear and Claude built it in one pass. But the channel (zip vs repo), the OS list and "who sets it up" came 3–4 prompts later, and each one rebuilt the packaging. The final shape was in the last prompt; putting it in the first would have saved two rebuilds.

### 2026-10-15 · exams for every lesson + an AWS SAA track
- **Before:** "I need to be able to learn quick … please impart exams also in our studies. make 5 exam tickets for each parts … aws_associate … 5 variants for that exam, as close to it as possible … questions with 4 or more answers."
- **After:** "Add exams: 5 variants per topic (20 scenario questions, 4+ options, architecture at scale, snippets OK), plus `aws-associate` = 5 × 65 SAA-C03-style variants, exams only. Done when every file passes a checker, a docs fact-check of ~10% AWS keys finds 0 wrong, and my first attempt lands in a log you can read. Long coding tickets are out; I code in real projects."
- **Why:** sizes, audience and the AWS target were clear. Missing: the proof, and the "no long coding, snippets yes" boundary, which surfaced only in the answer to the lessons question.

### 2026-10-15 · "I'll be away 3-4 hours, what can you work on?"
- **Before:** "I am going to be away for 3-4 hours. is there anything productive you can work on for gigabrain? … advice me what can this 3-4-5 hours could be spend on? so you work while I will be absent"
- **After:** "Away ~4 h, Mac kept awake. Do the exam fact-check (AWS first) then CORE regression evals. Done when each question has a sourced verdict, check-exam is 0 and a verifier confirms a sample. Fix in place, workflow ≤10 agents OK, stop cleanly at usage limit, no commits."
- **Why:** handing the choice to Claude worked, since it picked from the handoff's open items. But the done-line, the limit rule and the agent budget all came from a 4-question round. Keeping the Mac awake would have saved 2 of 9 agents.

## 2026-10-15: "I asked yu to create a portable and multiplatform tool … check if eveything is in place" (requirement-anchored audit)
- **Before:** "I asked yu to create a portable and multiplatform tool for me to give to my client. an executable file … only configuration needed is the server address and API_KEY … formatted for bitrix system in a way that requires couple of clicks to upload. check if eveything is in place"
- **After:** same requirement, plus: "Done when you give me a pass/fail per requirement, checked on the real files (latest bundle, binaries, server binding), and a fix order. Read-only: change nothing."
- **Why:** restating the requirement was the strong part. It turned "is it ready?" into a checklist, and the audit found the gaps outside the tool (localhost-only server, import format). A done-line with the output shape and "read-only" would have fixed the report format and the boundary up front, instead of leaving both to Claude.

### 2026-10-17 · idle-time scan, then "do everything you listed"
- **Before:** "time for an idle work … take a deep search for public market … analyze current weight of my repository … at what percentage would you evaluate we are utilizing claude codes powers", then "1. worktrees and agent teams … 2. observability … 3. anything cool … 4. everything you have listed".
- **After:** "Idle, ~3 h, $10 cap. (1) Scan public Claude Code setups: ranked top 5 with a primary source and a cost for each. (2) Repo weight: one table, what to prune. (3) A utilization % against the docs' feature list. Then build items 1–4. Done when each has a proof (test, eval or run), the reviewer has passed the diff, and nothing is committed. Ask before deleting files or spending over $5."
- **Why:** the four numbered asks were clear, and the list worked as scope. There was no proof, budget or output shape, so a 4-question round set them. The A/B test then ran over the $5 estimate because no cap was stated.

### 2026-10-18 · unrelated side project started in the brain repo
- **Before:** "could you also create a learning page for <hobby>? … some playground where I input … do not mess this up with gigabrain a lot, I just need to have a detour cours in /learn catalog", later "could we improve … with additional capabilities, such as … and more", and at the end "create another repository … take everything … and remove them from gigabrain".
- **After:** "New side project, not gigabrain: make ~/projects/<name> and start a session there. Build a lesson page on <hobby> with a planner: inputs <sizes>, outputs <list, layout, warnings>. v1 scope: <items>. Done when an independent script checks the planner's numbers for <one test case> and the page opens offline."
- **Why:** "don't mess with gigabrain" was the real constraint, but it reached the repo split only at the end, after two builds and a migration. Naming the home, the v1 scope and the proof in the first prompt removes the move and both question rounds. "…and more" left the scope open, so every option got picked and round 2 doubled in size.

### 2026-10-18 · spare tokens, no stop rule
- **Before:** "I have 100$ subscription, and I have too many tokens to spare … sharpen whatever repository we have … I can spare huge amount of tokens for overnight work"
- **After:** "Overnight, ≤40% of the weekly limit, no commits. First measure the ceiling (always-on tokens, last cuts). If a scout pass shows under 10% savings, stop and propose where the rest of the budget pays more. Done when inbox/night-<date>/REPORT.md has a before/after table and every check pass/fail."
- **Why:** "too many tokens" invited spending, not a result. The night found a 5% gain; a stop rule would have redirected the budget after the scout instead of running all six tracks.

### 2026-10-19 · compaction goal with no finish line
- **Before:** "start working on compacting our gigabrain, so it stays thin but sharp as still nevertheless, so it consumes less tokens and less time."
- **After:** "Compact gigabrain. Done when always-on context is under 3.5k tokens (`bin/budget.py`), trigger evals stay 9/9 and the process evals don't drop; CORE wording is off-limits. Hand me one script for anything you can't apply."
- **Why:** "thin but sharp" is a direction, not a target. A number and a no-regression bar let Claude stop at the right point, and the "one script" ask is what closed the round in a single command.
### 2026-10-20: Infra goal stated late
- **Before:** a pasted credentials note + "how to enter the server?", then the goal four prompts later.
- **After:** "The client rebuilt their on-prem box for our sync service. Goal: anyone I give an API key downloads fresh data with the downloader exe, no VPN. Done when the exe on a non-VPN laptop pulls a bundle from https://<host>. Access: VPN up, login is in my secrets file (don't read it). First get me in, then tell me what blocks the goal."
- **Why:** the goal decided everything that followed (no public SSH, self-hosted runner, one port). Stated first, it skips three explain-only rounds, and a secret named by location never lands in the transcript.

### 2026-10-20 · "what is the most used repositories in last month?"
- **Before:** "allright, now what is the most used repositories in last month?"
- **After:** "Rank repos by PRs opened since 2026-09-20, for my team (3 named teammates) and org-wide, top 10 each. Done when I see one table per scope and the gaps (rate limits, search caps)."
- **Why:** "used" could mean PRs, commits, deploys or traffic. Naming the metric, window and scope removes Claude's guess and makes the numbers comparable later.

### 2026-10-20 · "run onboard everywhere we will be potentially working first."
- **Before:** "run onboard everywhere we will be potentially working first."
- **After:** "Run /onboard-project on the repos for my 3 tickets plus the team's 7 busiest. Client kind, one shared local memory, don't touch team CLAUDE.md files. Done when kit doctor is clean and git status is empty in each."
- **Why:** "everywhere" meant 3, 12 or 48 repos; the three constraints were exactly the 4-question batch Claude had to ask. Naming them saves that round.

### 2026-10-21 · "up to the compose, I need it up and running"
- **Before:** "allright, up to the compose, I need it up and running, as best as In my abilities to utilize it as best as I possibly can"
- **After:** "Bring the local compose stack up: my team's services + their deps + Kafka UI/Grafana. Done when up.sh status is green, every gateway route is non-502 and I can log in at :8080. Allowed: builds, single-container restarts, local DB fixes with a backup. Ask first: wipes, stopping the stack, AWS. Never commit."
- **Why:** the done-line and the allowed/ask-first list were exactly what Claude had to ask, and later had to re-ask when "nothing remade" turned out to mean "no commits".

### 2026-10-22 · "could you make sure it works end to end yourself?"
- **Before:** "could you make sure it works end to end yourself?"
- **After:** "Prove the local stack end to end: a smoke script (containers, gateway routes, UIs, kafka/dynamo/sqs/s3/redis) that exits 0, plus one real request traced to where it lands. Allowed: local test data, restarting a single service after asking. Never: restart the stack, print secrets, commit."
- **Why:** Claude had to pick the proof and later stop to ask about restarting one service. Both were knowable up front, and the stop cost a round.

### 2026-10-22 · "help me break down and analyze task <ticket url>"
- **Before:** "help me break down and analyze task <ticket url>"
- **After:** "Analyze <ticket>. Done when: a table of every caller of the endpoint (file:line) across all repos, where each query's text comes from, and whether it can hit the deprecated feature; plus a draft ticket comment I approve before posting. Read-only; ask before posting."
- **Why:** the first answer covered only the main poller. Giga's later "are you absolutely sure?" (a good prompt) forced the recheck that found a second caller passing customer JQL and one unverified claim in the draft comment.

### 2026-10-22 · "pleas explain this task … help me understand where the necessary changes need to be applied"
- **Before:** "<ticket url> … explain this task in best and simplest way possible and help me understand where the necessary changes need to be applied"
- **After:** "Explain <ticket> simply, then verify it. Done when: a verdict per layer (code in all repos, public request path, live AWS read-only, prod traffic in New Relic) with the gaps named. Access: AWS CLI read-only approved, New Relic via my browser. Post nothing until I approve."
- **Why:** the verdict was rebuilt four times ("are you 100% sure?"), each time adding a layer (proxy WAF, live AWS, NACLs). Naming the layers and the access up front would have made it one pass.

### 2026-10-22 · "I am writing a personal message to devops. could you make it simple and understandable?"
- **Before:** "I am writing a personal message to devops. could you make it simple and understandable?"
- **After:** "Rewrite the DevOps message as a Slack DM to the package owner: 5 lines max, no code, one clear question (you or me?)."
- **Why:** the first draft was written for a channel, with code and a volume caveat. Naming the medium, length and the one question up front gets the DM in one pass. Giga's sent version (adding the version range and an honest "Claude's finding" note) worked: the owner answered in 2 minutes.

### 2026-10-22 · <pasted DM> + "this is my interraction with devops about telementary, closely related to my slack update task"
- **Before:** a pasted DM thread plus one line of context, with no ask.
- **After:** "Context: the DevOps DM below. Goal: a PR to the telemetry lib that fixes fetch tracing for the Slack upgrade, plus only the security updates that are safe. Done when: a test fails before and passes after, and I know exactly which security fixes reach services. First: plan + a ticket draft I can file; ask me once."
- **Why:** the session spent ~8 prompts discovering the deliverables (ticket, scope, security meaning, local E2E). Naming them up front, plus "every claim measured" (which Giga had to ask for later), would have produced the scoped plan in the first reply.

### 2026-10-23 · "full end to end test of our telemetry and slack update … see the test run finished … and the telemetry showing it in trace … on local"
- **Before:** named the observable result and the environment. No entry point, no stop rule, no allowed/ask-first.
- **After:** "Local E2E for <ticket>. Done when: one run-finished posts to my sandbox Slack and Grafana shows a `chat.postMessage` span after the swap, none before. Enter at the Kafka topic if the UI blocks twice. Allowed: local DB/containers; ask first: anything outside compose."
- **Why:** the observable carried the session. The missing entry point cost ~8 rounds of login, password and permission fixes in the UI before switching to the topic, which worked first time.

### 2026-10-23 · "could you help me create a PR for <ticket url>? check overall <work> jira patterns and also pattern for our slack ticket, create it in similar fashion"
- **Before:** named the reference ("our slack ticket", which turned out to be the linked ticket's PR), but not the length, the attribution wish or the done-line.
- **After:** "Open the PR for <ticket>. Style of <repo>#<pr> but about half as long; no Claude co-author or footer. Done when: PR open with real test counts and red-first evidence, and the Claude reviewer has run."
- **Why:** two follow-ups ("make it shorter", "remove generated by claude") cost an amend and a force-push. Both are standing preferences worth stating once (now in CORE.md).

### 2026-10-23 · "I need to run long nighttime jobs, each brainstorming about what each repository does, how are they maintained, … basically everything that I might need"
- **Before:** named the mode (overnight, unattended) and the topics, but not the output location, the proof of quality, the budget per night or the access (Jira, AWS). "Basically everything" left the scope open.
- **After:** "Design overnight jobs that build a local knowledge base for <work> under <path>: repos, maintenance, current team work, Jira, cloud. Done when: each night is a resumable script with a checker stage, and a 2-repo smoke run shows the wrong-claim rate. Access: gh ready, Jira MCP ready, read-only AWS profile <name>. Budget: one 5-hour window per night. Nothing named goes to the brain repo."
- **Why:** Claude supplied the proof (checker wrong-rate) and asked the access/runner batch; the smoke run then showed the real size (102 repos, ~150k tokens each), which split night 1 into two. A budget line up front would have sized it before the first run.


## 2026-10-26 · ticket triage opener
- **Before:** "help me with the review tickets which are sitting in In Review. what are next for them, on my standups team members mention things like deployments and also checking repos for interractnios with the changes which were been done in npm packages."
- **After:** "For my In Review tickets (<KEY-1>, <KEY-2>, <KEY-3>): list what's left before prod for each, and which repos consume the npm package change. Done when each ticket has a next step and an owner; read-only, nothing posted."
- **Why:** "the review tickets" made Claude sweep all 17 team tickets first; naming the keys and the done-line would have gone straight to the 3 that mattered.

## 2026-10-28 · learning artifact on a new protocol
- **Before:** "please elaborate further, what did he mean by mcp replacing APIs, and also explain is simple manner but in greater depth … use gigabrains learning tools to create a learning artifact, I think we already have one called mcp if I am not mistaken, elaborate it in this fashion or create a new /mcp-future"
- **After:** "/teach mcp-future, to the core, backend view. Hook: my lead's demo <artifact link> on the staging connector (read its tool descriptions, don't call tools). Must answer: what MCP replaces vs what it doesn't, use cases, where engineering is going (argued, labelled opinion). Done when check-lesson + check-exam pass and /learn opens it; give me a 10-line answer in chat too."
- **Why:** it named the tool and a fallback name, which was good. But "we already have one called mcp" was a lab, not a lesson, which cost a lookup; and no depth, done-line or staging boundary was given, so Claude had to supply all three.


## 2026-10-29 · launching an unattended batch
- **Before:** "run 1a, I will be gone for 1-2 hours" → (account flagged) → "assume caffenated mode and start running"
- **After:** "Run night 1a from the runbook now, in this session (personal account is OK for code reading; no secret files, no live data). Mac stays awake. Done when the night report shows the wrong-claim rate; if it's over 15%, fix the prompts for the next night but don't launch it."
- **Why:** the first two prompts settled the job and the caffeine question but not the account boundary, which cost a question round; the after-condition ("over 15% → fix, don't launch") was what Claude had to decide alone.
