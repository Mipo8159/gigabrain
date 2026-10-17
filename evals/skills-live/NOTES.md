# Skill auto-trigger gap: live sessions vs evals (2026-10-17, overnight)

Question: in real sessions skills almost never auto-trigger, but `bin/eval-skills`
and `evals/skills-hard` pass. Why the gap?

**Answer in one line:** the eval staging leaves out the brain's own context.
`CORE.md` and the coach hook tell the model to *suggest* `/retro`, so with that
context the retro trigger falls from 6/6 to 0/6. Listing size (11 vs 42 user
skills) changes nothing. On top of that, real chances to trigger are rare:
Giga types the slash command first.

## 1. Live rate (transcripts)

Method: `python3 evals/skills-live/transcript-rate.py` (reuses the
`bin/usage-report` rules: typed prompt = user record that isn't meta, sidechain,
compact summary, tool result, or `<…`/`[Request interrupted`; slash command =
`<command-name>` in the first 300 characters). It counts every `Skill` tool_use
in the main chain and splits it by the kind of turn it ran in. Keyword rules
shortlist possible matches. **Each candidate was then labelled by hand** from
the prompt and the first assistant actions.

Window: transcripts only exist from **2026-10-12** (older ones were cleaned up
before `cleanupPeriodDays` went to 365), so "30 days" is really 6 days.

| | count |
|---|---|
| real sessions (4 project dirs, eval/temp dirs excluded) | 28 |
| typed prompts | 81 (snapshot before this run) |
| slash commands | 20: `/retro` 7, `/learn` 4, `/onboard-project` 2, `/intent-review` 1, `/curate` 1, other 5 |
| `Skill` calls the model made itself | **1** (`workflow-authoring`, a built-in skill, not Giga's) |
| `Skill` calls in sidechains | 0 |

Opportunities (hand-labelled, prompts paraphrased):

| Skill | Prompt (paraphrase) | Loaded? | What happened |
|---|---|---|---|
| retro | "before I end, anything to do? like retro?" (10-13) | no | the reply said "Run `/retro` now"; Giga typed `/retro` 5 min later |
| retro | "what's left from my side? retro?" (10-16) | no | the reply said "`/retro` comes after the commit"; Giga typed `/retro` 5 min later |
| onboard-project | "how to use gigabrain for this generated repo" (10-12) | no | answered with guidelines (a how-to question, so arguably right) |
| build-loop | "keep working all night, I'm asleep" (10-12) | no | ran the loop inline: wrote its own done-table and proofs |
| debug-protocol | "yes, fix" ×2 (follow-ups to its own diagnosis) | no | followed CORE inline ("the proof will be a selftest case") |

Clear opportunities: **3, hits 0** (retro 2, onboard 1). Soft ones: 3, hits 0.
Every keyword hit for debug, teach or learn was a false positive (pasted quiz
text, or requests to *build* gigabrain's learning features). Most of the 81
prompts fit no skill at all (installs, quiz answers, "what's next").

Both retro misses happened before the 2026-10-17 change that added sign-off
phrases to the description, but section 2 shows the current description
fails the same way once the brain context is present.

Listing check: `skill_listing` attachments show live sessions list **73–93
skills** in about 30,000 characters. Giga's skills (the 42 user skills,
plus any gigabrain plugin skills that are enabled) come first, with their full
descriptions. Only the `anthropic-skills:*` entries at the end get
cut down to bare names when the budget runs out. So description truncation
does not affect Giga's skills.

## 2. Reproduction (`evals/skills-live/run.sh <arm>`)

13 cases in `cases/`: 10 trigger cases (3 come from real misses, including
the verbatim retro question) and 3 negative cases (one is a mid-session
"that's all for X, now Y", which guards against the wrap-up rule over-firing).
Same grader shapes as `skills-hard`. Each run is a fresh session with
`allowed_tools: [Read, Glob, Grep, Skill]`.

| Arm | What it stages | Results dir (`results/`) | Cost |
|---|---|---|---|
| s11 | 11 global skills (like `bin/eval-skills`) | s11-20261017-033306 | $2.04 |
| s42 | + 31 library skills (the user listing a live session has) | s42-20261017-033424 | $2.39 |
| s42ctx | s42 + SessionStart hook printing CORE.md + gigabrain/CLAUDE.md + a copy of coach.py (headless guard bypassed, signals off) | s42ctx-20261017-033538 (+ -033715 kept traces, -034029, -034037 new cases) | $2.89 + $0.35 + $0.23 + $0.27 |
| fix | s42ctx with `fix/CORE.md` + `fix/coach.py` | s42ctx-fix-fix-20261017-033832 | $3.66 (hit the $3 ceiling; retro-today got 1 run) |

**Total spend: $11.83** (cap $15).

| Case | s11 | s42 | s42ctx | fix |
|---|---|---|---|---|
| live-retro-asks (verbatim real miss) | 2/2 | 2/2 | **0/2** (+0/1 kept) | 2/2 |
| live-retro-night | 2/2 | 2/2 | **0/2** (+0/1) | 2/2 |
| live-retro-today | 2/2 | 2/2 | **0/2** (+0/1) | 1/1 |
| live-retro-heldout (no coach cue fires) | – | – | 0/2 | 2/2 |
| live-debug-dupes | 2/2 | 2/2 | 2/2 | 2/2 |
| live-debug-failing | 2/2 | 2/2 | 1/2 | 2/2 |
| live-onboard-setup | 2/2 | 2/2 | 2/2 | 2/2 |
| live-onboard-howto (real, soft) | 0/2 | 0/2 | 0/2 | 0/2 |
| live-build-loop | 2/2 | 2/2 | 2/2 | 2/2 |
| live-neg-install / -thanks (no skill) | 4/4 | 4/4 | 4/4 | 4/4 |
| live-neg-continue (no retro) | – | – | 2/2 | 2/2 |

The hooks fired: in the kept sandbox transcript
(`/private/tmp/e-hurQMr/config/projects/*/847d01a6….jsonl`, temp) there is a
`hook_success` record for SessionStart carrying CORE.md, and one for
UserPromptSubmit carrying the `[gigabrain coach]` wrap-up cue. The model's reply
reused the cue almost word for word: "Run `/retro` before you go? It can pick up
missed sessions…".

**Reproduced: yes, for retro.** The real failure (it offers `/retro` and doesn't
load it) appears only once the brain context is staged. Skill count does not
cause it (s11 = s42).

## 3. Causes, ranked

1. **The brain tells the model to offer, not run** (proven for retro). `CORE.md`
   says "If a session is ending with no retro, suggest it once". The coach cue
   says "offer it in ONE line: 'Run /retro before you go?'". `/retro` also
   commits and pushes, and CORE says to confirm anything that pushes. Every
   signal points to "suggest". s42 → s42ctx: 6/6 → 0/6, and the replies quote
   the cue.
2. **Few real chances, and the slash command comes first** (measured). In 6
   days only 3 prompts clearly matched a skill. Giga typed 15 skill commands,
   so the model never got the chance. "Almost never auto-triggers" is mostly a
   small denominator, not a high miss rate.
3. **CORE paraphrases skills, so the model acts inline** (plausible, weak
   evidence). The live build-loop and debug follow-ups followed the protocol
   without loading the skill. In staging, debug-failing went 1/2 with context
   and 2/2 with the fix's "load, don't paraphrase" line. n=2, so this is
   not proven.
4. **Listing size or truncation: ruled out.** s11 = s42 (18/20 each), and
   Giga's skills are never truncated in the live listing.
5. **Description wording.** It only matters for the soft onboard how-to
   (0/2 in every arm). That is probably a correct non-trigger: a question about
   how, not a request to set up.

## Still unproven, and how staging differs from live

- **Mid-session state.** Every eval is turn 1 of an empty session. The real
  misses came after hours of work with uncommitted diffs: in the 10-16 miss the
  model put the commit before the retro on purpose. A fix that makes retro
  load could still lose to "the commit comes first" in a live session.
- Tools are limited to Read, Glob, Grep and Skill. Live sessions have Bash and
  Edit, so there is more pull to act directly.
- Not staged: project memory, the SessionStart handoff (inbox-status), guard.py,
  the ~30 built-in and anthropic skills, and auto mode. On its first prompt a
  live session gets the coaching focus. This copy gets it only when a cue fires.
- n=2 per cell. The debug change (1/2 → 2/2) is noise-level.
- No ablation splitting CORE from coach for retro. The held-out and the
  retro question (no coach cue fires for either) pass with the CORE line
  alone, so the CORE line is enough for those two.
- Whether auto-running `/retro` is what Giga *wants* is a policy choice, not a
  measurement. See the proposal in `inbox/proposal-2026-10-18-skill-trigger.md`.
