# Roadmap — close the gigabrain gaps, grow Giga's AI skill

Agreed 2026-10-05. Pace: **~3 hours a week** outside client work. Coaching:
**firm**. Each phase fixes one gigabrain gap *and* trains Giga in one Claude
skill. Progress is tracked where it already lives: `/retro` rows in
`me/scorecard.md`, the monthly re-score, and the `Now:` line below, which the
coach hook adds to every session. There is no second tracker.

**Now:** Phase 2, step 1 (second half). Giga launches `claude -w routine`. There: a headless weekly job (`signals-report` + `check-library --drift` + `bin/eval-skills` + `bin/eval-knowledge --domain process --arms base,brain`, the CORE regression) writes a report for `/curate`, never a push. Coach signal pollution: fixed 2026-10-13.

`/retro` moves the `Now:` line, and marks a phase done only when its proof is shown.

## Phases

| # | Due | Gap it closes | Claude skill Giga practises | Done when (proof) | Who | Status |
|---|---|---|---|---|---|---|
| 0 | 2026-10-05 | no roadmap; the coach can't see it; outdated SessionEnd wording | a first prompt with done-line, environment and scope | this file exists; the coach hook prints `Now:` and a firm cue on a sample prompt; secret scan passes | Claude | done 2026-10-05 |
| 1 | 2026-10-18 | every library skill loads in every session (noise, context cost); no tests that skills trigger; setup tied to `~/.claude` symlinks | plan mode; **Giga launches the worktree** (`claude -w plugin`) | docs checked first; off-stack skills retired via `sources.json`; `claude plugin eval` passes for the 7 core skills; a NestJS repo session no longer lists homelab or network skills | Giga launches, Claude builds | done 2026-10-12 (16 skills moved into `homelab`, `media` and `content` plugins via `library/plugins.json`; eval 9/9; scratch Nest repo shows 0 of them, 10 with the plugin. Worktree practice not done, moved to phase 2) |
| 2 | 2026-10-25 | Automation scores 0 (scorecard dimension 10) | a `/schedule` routine, headless `claude -p` | one weekly routine has run: signals report and ECC drift check, written as a report or PR for `/curate` (never a direct push) | both | |
| 3 | 2026-11-08 | no Kafka knowledge; Giga hasn't coded in any logged session | `tutor`: **Giga writes the core** | a Kafka skill written from live docs (`researcher`); the core of one tracker step coded by Giga (step 0 `workflow.ts` first), tests pass; skill confidence at least 0.5 | **Giga codes** | knowledge half re-scoped 2026-10-13: Kafka brief, 16 eval cases (vanilla 16/16, so no skill needed), lesson (`/learn kafka`) and 8 practice tickets exist. Left: Giga codes |
| 4 | 2026-11-15 | no PHP/Bitrix knowledge (lutecia) | `researcher` + `verifier` on a remote-only target | generic Bitrix/PHP skill from live docs (no client facts); used in one lutecia session; ledger evidence line | both | |
| 5 | 2026-11-29 | Terraform / observability depth | `search-first`, `/code-review` on infra diffs | Terraform + observability skills (absorbed or written), mapped in `kit/stacks.json`; each used once with evidence | both | |
| 6 | 2026-11-15 | 6 newEra CLAUDE.md drafts never filled in | `/onboard-project`, **one short session per repo** | `bin/kit doctor --all` shows 0 warnings | **Giga runs it** (about 1 a week, alongside other work) | |
| 7 | 2026-11-30 | 52 library entries unproven at 0.4 | `reviewer` or `/code-review` on every diff over 100 lines | at least 10 entries moved off 0.4 in `brain/library-ledger.md` | `/retro` | |

**Library growth is planned in `library/candidates/README.md`** (from a
parallel session, 2026-10-05). Its phases are called C1–C4 here so the numbers
don't clash. It feeds this roadmap instead of competing with it. C1 (absorb the
Tier A backend, Kubernetes and cloud subset) is the first source to check for
phase 5. C3 (our own teach, lab and visualise skill) runs with phase 3's tutor
work. Do C1 *after* phase 1, so new skills land in a scoped plugin, not the
global pile.

Phase 1 retirement list (confirm with Giga at its start): `cisco-ios-patterns`,
`netmiko-ssh-automation`, `network-*` (3), `homelab-*` (5), `seo`. **Keep**
`remotion-video-creation` / `video-editing` (pala's stack maps them). Ask about
`manim-video`, `fal-ai-media`, `content-engine`, `brand-voice`, `email-ops`.

## Scorecard targets (re-score 2026-11-01, 2026-12-01, 2026-12-31)

| Dim | 2026-10 | Target 2026-12-31 | Moved mostly by |
|---|---|---|---|
| 3 Done-criteria & verification | 2 | 7 | firm coaching on every build prompt |
| 4 Debugging style | 3 | 6 | debug-protocol, plus prompts with expected, got, what changed, suspect |
| 5 Context management | 3 | 6 | one goal per session (phases 6, 3) |
| 6 Parallel work | 0 | 5 | phase 1 worktree, then routinely |
| 7 Enforcement | 1 | 7 | guard (done) + plugin eval (phase 1) |
| 8 Project instructions | 0 | 8 | phase 6 |
| 9 Review pass | 1 | 7 | phase 7 |
| 10 Automation | 0 | 5 | phase 2 |
| 11 Learning from AI | 3 | 6 | phase 3 |

"Perfection" is not a target, because it can't be checked. The next horizon
after 2026-12-31: all 11 dimensions at 8 or more, holding for two re-scores.

## Firm coaching contract

- A build prompt with no done-line, environment or access: Claude adds that to
  its one up-front question batch before building (one question, no lecture).
- A multi-part task: a "Split" line before starting. Giga launches the worktree halves.
- At most one `💡` per reply, and only when it would clearly change the outcome.
- A session ending with no `/retro`: offer it once.
