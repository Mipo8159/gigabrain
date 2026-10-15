# AI-usage scorecard

Giga and Claude re-score this **every month** from evidence (prompt history,
the signals below), never from gut feeling. The trend matters, not any single
number. Scores run 0 to 10.

## Starting point, 2026-10-01 (using about 20–25% of what Claude could do)

Evidence: 958 prompts in 126 sessions from 2026-06-01 to 2026-10-01, plus the
tool logs of the 59 transcripts still on disk.

| # | Dimension | 2026-10 | Evidence at baseline | Target behaviour |
|---|---|---|---|---|
| 1 | Domain / intent in prompts | 8 | rich feature specs (transactions, enums, edge cases) | keep |
| 2 | Customisation (memory, skills) | 6 | 7 custom skills, shared memory, asked for build-loop | brain + curation loop running |
| 3 | Done-criteria & verification | 2 | "criteria" 0 times, "verify" 2 times; "is everything set?", "that's it?" | every task has "done when…" and a proof |
| 4 | Debugging style | 3 | "help me fix this" + paste; "so what is the problem?" | expected/actual/hypothesis; Claude reproduces |
| 5 | Context management | 3 | /clear once, /compact once, exit 45 times, /usage 29 times | one goal per session; fresh context; right model |
| 6 | Parallel work | 0 | no worktrees, no parallel sessions | 2–3 sessions in worktrees routinely |
| 7 | Enforcement (hooks, permissions) | 1 | no hooks; rules only as advisory memory | rules that must hold are hooks/permissions |
| 8 | Project instructions (CLAUDE.md) | 0 | none, incl. clasico (~570 prompts) | every active repo has a lean CLAUDE.md |
| 9 | Review pass | 1 | /code-review, /simplify never used | reviewer subagent on every non-trivial diff |
| 10 | Automation (headless, CI, schedule) | 0 | claude -p, GitHub Action, /schedule unused | at least 1 recurring automated job |
| 11 | Learning from AI | 3 | Claude wrote 100% of issue-flow | tutor mode in labs; Giga writes the core |

## Monthly history

| Month | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10 | 8 | 6 | 2 | 3 | 3 | 0 | 1 | 0 | 1 | 0 | 3 | baseline |

## Prompt-signal trend (`bin/signals-report.py`)

The starting rows were made by replaying old prompts through the coach hook's
pattern checks (2026-10-02). These are rough regex signals: read the
direction, not the decimals. ↑ means higher is better, ↓ lower is better.

| month | prompts | done% (↑) | no_done (↓) | debug_no_hypothesis (↓) | asks_status (↓) | vague (↓) | multi_task (↓) | research (↓) |
|---|---|---|---|---|---|---|---|---|
| 2026-06 | 222 | 10% | 31% | 10% | 0% | 2% | 0% | 0% |
| 2026-07 | 85 | 16% | 19% | 5% | 0% | 0% | 0% | 1% |
| 2026-08 | 399 | 21% | 17% | 5% | 1% | 1% | 1% | 0% |
| 2026-09 | 181 | 56% | 8% | 6% | 2% | 1% | 1% | 1% |
| 2026-10 | 49 | 67% | 10% | 10% | 2% | 0% | 12% | 0% |

(2026-10 row refreshed at /curate 2026-10-03, after dropping 7 `claude -p` probe rows from 2026-10-02 15:38.)

Later months come from `bin/signals-report.py`, which reads the coach hook's
log. Compare them at each monthly re-score.

## Session signals (appended by /retro)

| Date | Project | Done-criteria | Plan | Debug style | Proof | Subagents/parallel | Review | Giga coded |
|---|---|---|---|---|---|---|---|---|
| 2026-10-02 | client (onboard + price unit change) | no (Claude proposed) | yes (plan + 1 question batch) | n.a. | yes (schema script, throwaway-DB migration test) | Explore sweep, background reviewer; Giga asked for agents | yes, reviewer found rollout risks | no |
| 2026-10-02 | client (2-bug debug, 2 repos) | no | yes (one question batch, then autonomous) | "what changed" given; no IDs/error/hypothesis | yes (QA logs + URL-shape check; post-deploy rerun pending) | none during debug (serial; 2 log sweeps timed out in foreground); then built a `verifier` agent (generic + client override), proven with per-dir `claude -p` probes | no (diff ~21 lines) | no |
| 2026-10-02 | client (role-gated field edit, 2 repos) | yes, but not checkable ("without any issues"); no access | yes (2-question batch, then autonomous) | n.a. | partial (build/lint/tsc; live API+UI proof pending core + login) | background reviewer in parallel with the wait; Giga asked for agentic | yes, reviewer confirmed the fix and found a role-escalation path + secrets in README | no |
| 2026-10-02 | client (OAuth consent-dialog domain, analysis) | yes on 2nd prompt ("definitive answer whether backend can do it"); 1st was "analyze following" | n.a. | n.a. | partial (code read + order-of-events; device check pending) | none (3 small greps, serial) | no (no diff) | no |
| 2026-10-02 | client (onboard remote-only server workspace) | n.a. (skill invocation; Claude stated proof: hook test table) | yes (one 4-question batch) | n.a. | yes (11-case guard table, all pass after a `\b` fix) | none (empty folder, nothing to sweep) | no (diff <100 lines) | no |
| 2026-10-02 | client (push-repo explainer → review-result push feature) | yes, counted ("2 rejects + 1 approval = 3 pushes"); env/access came later | yes (recommendation table + 4-question batch, then autonomous) | n.a. | yes (local 3-job run, 409 control, prod image build; FCM topic dry-run handed to Giga) | background reviewer; verifier + researcher in parallel; secrets skill; Giga asked "always squeeze agents/skills/hooks" | yes, reviewer found retry-resends-after-send | no |
| 2026-10-03 | gigabrain (ECC analysis → library absorb → kit + guard + rollout to 10 projects) | partly (goal + time budget; no done-line, no action boundaries) | yes (Claude plan + one 4-question batch, then autonomous) | n.a. | yes (167-case selftest, mutation checks, real `claude -p` probes, dry-run before every apply) | heavy: 4 analysis agents, 6 forks, claude-code-guide doc check, 4 background reviews (25+ issues found and fixed) | yes, 4 reviewer passes | no |
| 2026-10-04/05 | client (onboarding audit → region-scoping fix + channel scope bug → push-review re-verify) | yes on the region task (decidable done) but no env/access (SSO expired) and scope added after proof; push re-check had an env boundary ("local only") | yes (3-question batch with a recommendation, then autonomous) | n.a. | yes (10-check + chain run on a side-port bundle, mismatching-header proof, 56 offline text checks with control, Redis-MONITOR job capture; all test data cleaned) | none (serial, small diffs; Claude found an existing feature mostly done) | no (diffs <100 lines; authz-adjacent but consistency-only) | no |
| 2026-10-04/05 | client (cloud-CRM integration scoping → ERP SQL discovery → incremental CSV exporter) | no on the build prompt (Claude stated proof first; Giga chose options via 4-question batch); VPN access dropped 3× mid-task | yes (one 4-question batch, then autonomous build/test/fix) | n.a. (auth failure: Claude did the shape-diff late, after 4 lockout attempts) | yes (23 offline tests; live: counts = DB, rerun emits 0, store-day revenue = payments per store to the tetri) | background reviewer during VPN wait; researcher not used (Claude did live web checks inline) | yes, reviewer found 1 blocker + 11 should-fix, all fixed with tests | no |
| 2026-10-05 | gigabrain (scout ECC-like learning repos → candidates README + plan) | no (2 prompts no_done; Claude stated the proof: check-library + secret scan) | n.a. (research; Claude led with a recommendation, then waited for a go) | n.a. | yes (GitHub API facts for 30 repos, licence-file check, check-library 0 failures, scan clean) | none (serial research; phase 1 planned as 3 parallel forks) | no (docs only) | no |
| 2026-10-05 | gigabrain (capability/gap assessment → roadmap + coach milestone) | no ("move me to perfection"; Claude replaced it with scorecard targets + per-phase proofs) | yes (plan + one 4-question batch, then autonomous) | n.a. | yes (4 coach-hook probes incl. missing-roadmap fallback, signals to a temp file; secret scan clean) | none (small serial diff; a parallel session wrote a second plan the same day, now linked) | no (diff <100 lines) | no |
| 2026-10-05 | client (one-line default flip: creator channels published on create) | partly (clear target, no done-line; old rows and visibility left open) | n.a. (no questions; Claude flagged the backfill and empty-channel visibility at the end) | n.a. | partly (tsc + eslint clean; no curl, serve bundle stale) | none (trivial serial change) | no (1-line diff) | no |
| 2026-10-06 | gigabrain + new lab (install check → kit analysis → keep-vs-rebuild → tracker step 0 + onboarding) | no on all 3 build/analysis prompts (Claude stated proofs; one 4-question batch) | yes (plan table + question batch, then autonomous) | n.a. | yes (stub run: only 6 workflow e2e red; reference impl 28/28 e2e ×3 + 24/24 unit; boot + migrate on dev DB; visual headless-clicked) | background reviewer during docs/visual work; no worktree (serial greenfield) | yes, reviewer found 1 blocker (last-admin) + 9 should-fix, all fixed with e2e cases | no (workflow.ts handed over) |
| 2026-10-12 | gigabrain (analyse uncommitted work → audit mode for intent-reviewer → usage/billing check → 2 practice repos) | no (3 build prompts without a done-line; Claude stated the proof each time; "use fewer tokens" was a good constraint) | yes (plan line, then autonomous) | n.a. | yes (eval: audit case 1/1 with plan, old cases 6/7 = baseline; practice repos npm test green, kit detect node+postgres) | 2 eval runs in parallel in the background; no worktree (serial) | no (agent/eval files, <100 lines each) | no |
| 2026-10-12 | gigabrain ("improve gigabrain" → roadmap phase 1: opt-in skill plugins + core-skill trigger evals) | no (vague goal, no done-line; Claude argued for the roadmap step and set the proof; one 4-question batch with budget + action boundary) | yes (recommendation + plan, then autonomous) | n.a. | yes (scratch Nest repo 0 vs 10 plugin skills, eval 9/9, byte-identical move, 6 mutation checks, selftest + check-library) | claude-code-guide docs check in background before the answers; background reviewer (7 findings, all fixed); worktree **not** launched by Giga | yes, reviewer caught the flattened eval + stale secret allowlist | no |
| 2026-10-13 | gigabrain (overnight autonomous: knowledge + process evals, CORE ablation, teach/learn lessons, practice gym) | no (2 build prompts no_done; Claude set per-track done-when in a night plan) | yes (one go-ahead, then about 12 h autonomous; no questions while Giga slept) | yes (every eval failure audited before trusting; 3 were harness artifacts) | yes (414 graded runs; check-lesson on 9 pages; fact-check + 42P10 on PG17; bin/learn path tests) | heavy: 6 background authoring/lesson agents, researcher fact-check, sequential eval queues; no worktree | no reviewer on the runner diff (eval tooling, not product) | no (lessons built for Giga; practice not started) |
| 2026-10-14 | gigabrain (wrap-up: install, next steps, apply proposals, commit, /learn) | n.a. (short asks; "do these steps for me" carried an implicit done-line from Claude's numbered list) | yes (one ask, done end-to-end) | n.a. | yes (allow rule visible in settings.json; reviewer loaded 4 checklists in an eval rerun; full scan clean; client-term check on the commit 0) | none (serial admin) | no (config + allowlist, small) | no (practice not started) |
| 2026-10-14 | gigabrain (teach kit v2: research → kit + checker v2 → 9 lessons rebuilt by background agents) | no (build prompt had goal + scope + a research question, no done-line; Claude proposed checker-v2 + eyeball, Giga picked it in one 4-question batch) | yes (plan line, then autonomous) | yes (each checker false pass reproduced, then a broken copy proven red) | yes (9/9 PASS on final kit; example + 5 broken copies prove the checker fails) | heavy: researcher, reviewer, 9 builders 3 at a time, all background; no worktree (one repo, cache-only output) | yes, reviewer found 2 blockers + 7 should-fix in the kit/checker, all fixed before stamping | no |
| 2026-10-14/15 | gigabrain (/learn kafka → /curate + decisions → install → exams for 10 topics incl. AWS SAA-C03 track) | no on the exam build (815-char spec, no done-line; Claude proposed checker + fact-check + live take, one 4-question batch) | yes (one batch, then about 6 h autonomous) | n.a. | yes (check-exam 1,225 q 0 problems; runner e2e + mutations; 2 docs fact-checks found 3 wrong keys + ~10 false claims, all fixed; 245 refs 200) | heavy: 14 writer agents, 4 researcher fact-checks, 1 fixer, background reviewer; no worktree | yes, reviewer found 2 blockers + rebinding/XSS in the localhost server, all fixed with 403/escape tests | no (exams built; first take pending) |
