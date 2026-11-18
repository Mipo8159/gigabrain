---
name: retro-push-blocked-lets-two-brains-diverge
description: "brain-commit refuses to push while older commits are unpushed; across two machines that piles up into a divergent brain. Rebase with keep-both resolution, scan before push."
metadata:
  type: feedback
---

**Rule:** gigabrain is written from two machines. When a retro's push is refused ("N earlier commits of yours are
unpushed"), sync the same day: `git pull --rebase`, then push. Left alone, every later retro on that machine adds
to the pile while the other machine keeps pushing.

**Why:** 2026-11-19: 5 local retro commits (3 sessions) met 29 remote ones. The rebase stopped on every commit in
the append-style files (prompt log, scorecard, coaching evidence, journals, ledger rows) and on a pattern the other
machine had merged away during a cleanup. One of the unpushed commits also held a client term that the newer
client-terms list (from the other machine) flagged: the scan that passed at commit time was stale.

**How to apply:** resolve append logs by keeping both sides (upstream first); ledger rows by one row with the union
of dated evidence entries and the higher confidence (never two rows); a modify/delete by folding the edit into the
entry that absorbed the deleted one. A rebase skips the pre-commit hook: run `.githooks/pre-commit --all` before the
push, and rewrite unpushed commits (not a follow-up commit) when it flags a client term, so it never reaches the
remote. Keep a backup branch until the push lands.
**Signal:** "not pushed: N earlier commit(s) of yours are unpushed" in a retro's output; `git status -sb` showing
both ahead and behind.
**Next time:** at the start of a retro, `git pull --rebase` first; if the push is refused, do the sync in that
session instead of leaving it to the next one.
