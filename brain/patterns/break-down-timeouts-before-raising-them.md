---
name: break-down-timeouts-before-raising-them
description: "A caller-side timeout rate is a symptom, not a cause. Break it down per job (starts vs completions), then read the server's own time (DB vs external, per statement) before recommending a bigger timeout. 2026-11-20: 97% of a scheduler's timeouts were one job whose server query hit a server-side kill, so a bigger caller timeout would not have helped."
metadata:
  type: feedback
---

**Rule:** before recommending a bigger timeout (or calling it "the fix"), attribute the
timeouts to units of work and find where the time is spent on the *server*.

**Why:** 2026-11-20, a cron-style scheduler (function invoked async per job, 6 s timeout,
POSTing to an app that does the work). ~9% of invocations timed out, and the first answer
was "raise it to 60 s, those jobs will finish". The breakdown showed:
- 97% of timeouts were one job: 288 runs/day × 3 attempts (async retries), **0 completions**
  for 20 days, a cliff at one hour on a weekend with no code change.
- The app's APM showed that job at exactly 120 s every run, all of it in one DB SELECT
  (per-statement metric scoped to the transaction), then HTTP 500 → a server-side kill.
  So a 60 s caller timeout could never help; the real outage was silent (no emails sent).
- Only the remaining ~3% were jobs that run 6–60 s and finish anyway; for those 60 s was right.

**How to apply:**
1. Per job: count starts and completions per day (log lines carrying the job name). A
   steady starts = schedule × (1 + retries) with 0 completions marks a permanently failing job.
2. Retries: total starts vs unique request ids (async retries keep the id).
3. Server side: APM duration p50/max per endpoint; if p50 ≈ max ≈ a round number, a server
   limit is killing it. Then `databaseDuration` vs `externalDuration`, then per-statement
   time via the transaction-scoped metric.
4. Proof that the bigger timeout helps the rest: an environment where it was already
   raised (config drift is a free before/after), plus a local repro with the real handler,
   a mock slow server, and simulated timeout + retries; assert both cases (helps / can't help).
5. Word the done-line so the opposite result can pass ("show whether 60 s fixes it").

**Signal:** "it times out, should we raise the timeout?", a timeout rate quoted as one number,
"6 s is too low".
**Next time:** facet the timeouts by job and read the server's duration before giving any verdict.
Related: [[side-effect-jobs-must-not-fail-after-send]], [[prove-an-outage-from-the-hosts-own-records]].
