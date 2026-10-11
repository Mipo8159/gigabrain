# Roadmap — close the gigaforge gaps, grow Giga's AI skill

Agreed 2026-10-05. Pace: **~3 h/week** outside client work. Coaching: **firm**.
Each phase fixes one gigaforge gap *and* trains one Claude skill on Giga's side.
Progress is tracked where it already lives: `/retro` rows in `me/scorecard.md`,
the monthly re-score, and the `Now:` line below, which the coach hook injects
into every session. No second tracker.

**Now:** Phase 1, step 1 — verify per-project plugin scoping + `claude plugin eval` against live docs (claude-code-guide / researcher), then Giga launches the plugin worktree (`claude -w plugin`).

`/retro` moves the `Now:` line and ticks a phase only when its proof is shown.

## Phases

| # | Due | Gap it closes | Claude skill Giga practises | Done when (proof) | Who | Status |
|---|---|---|---|---|---|---|
| 0 | 2026-10-05 | no roadmap; coach can't see it; stale SessionEnd wording | first prompt with done + env + scope | this file exists; coach hook prints `Now:` + firm cue on a sample prompt; secret scan passes | Claude | done 2026-10-05 |
| 1 | 2026-10-18 | every library skill loads globally (noise, context); no trigger tests; setup tied to `~/.claude` symlinks | plan mode; **Giga launches the worktree** (`claude -w plugin`) | docs checked first; off-stack skills retired via `sources.json`; `claude plugin eval` green for the 7 core skills; a NestJS-repo session no longer lists homelab/network skills | Giga launches, Claude builds | |
| 2 | 2026-10-25 | Automation = 0 (scorecard dim 10) | `/schedule` routine, headless `claude -p` | one weekly routine has run: signals report + ECC drift check, output as a report/PR for `/curate` (never a direct push) | both | |
| 3 | 2026-11-08 | no Kafka knowledge; Giga hasn't coded in any logged session | `tutor` — **Giga writes the core** | Kafka skill written from live docs (`researcher`); one tracker step core coded by Giga (step 0 `workflow.ts` is first), tests green; skill confidence ≥ 0.5 | **Giga codes** | |
| 4 | 2026-11-15 | no PHP/Bitrix knowledge (lutecia) | `researcher` + `verifier` on a remote-only target | generic Bitrix/PHP skill from live docs (no client facts); used in one lutecia session; ledger evidence line | both | |
| 5 | 2026-11-29 | Terraform / observability depth | `search-first`, `/code-review` on infra diffs | Terraform + observability skills (absorbed or written), mapped in `kit/stacks.json`; each used once with evidence | both | |
| 6 | 2026-11-15 | 6 newEra CLAUDE.md scaffolds untouched | `/onboard-project`, **one short session per repo** | `bin/kit doctor --all` shows 0 warnings | **Giga runs it** (≈1/week, piggyback) | |
| 7 | 2026-11-30 | 52 library entries unproven at 0.4 | `reviewer` / `/code-review` on every diff > 100 lines | ≥ 10 entries off 0.4 in `brain/library-ledger.md` | `/retro` | |

**Library growth lives in `library/candidates/README.md`** (a parallel session,
2026-10-05; its phases are called C1–C4 here so the numbers don't clash). It
feeds this roadmap rather than competing with it: C1 (absorb Tier A:
backend/k8s/cloud subset) is the first source to check for phase 5, and C3 (our
own teach→lab→visualise skill) runs with phase 3's tutor work. Do C1 *after*
phase 1, so the new skills land in the scoped plugin, not the global pile.

Phase 1 retirement list (confirm with Giga at its start): `cisco-ios-patterns`,
`netmiko-ssh-automation`, `network-*` (3), `homelab-*` (5), `seo`. **Keep**
`remotion-video-creation` / `video-editing` (pala's stack maps them). Ask about
`manim-video`, `fal-ai-media`, `content-engine`, `brand-voice`, `email-ops`.

## Scorecard targets (re-score 2026-11-01, 2026-12-01, 2026-12-31)

| Dim | 2026-10 | Target 2026-12-31 | Moved mostly by |
|---|---|---|---|
| 3 Done-criteria & verification | 2 | 7 | firm coaching on every build prompt |
| 4 Debugging style | 3 | 6 | debug-protocol + "Expected/got/changed/suspect" prompts |
| 5 Context management | 3 | 6 | one goal per session (phases 6, 3) |
| 6 Parallel work | 0 | 5 | phase 1 worktree, then routinely |
| 7 Enforcement | 1 | 7 | guard (done) + plugin eval (phase 1) |
| 8 Project instructions | 0 | 8 | phase 6 |
| 9 Review pass | 1 | 7 | phase 7 |
| 10 Automation | 0 | 5 | phase 2 |
| 11 Learning from AI | 3 | 6 | phase 3 |

"Perfection" is not a target: it can't be checked. All 11 dims ≥ 8 and holding
for two re-scores is the next horizon after 2026-12-31.

## Firm coaching contract

- Build prompt with no done-line / env / access → Claude puts that into its one
  up-front question batch before building (one question, no lecture).
- Multi-part task → a "Split" line before starting; worktree halves are
  launched by Giga.
- At most one `💡` per reply, only when it would materially change the outcome.
- Session wrapping up with no `/retro` → offer it once.
