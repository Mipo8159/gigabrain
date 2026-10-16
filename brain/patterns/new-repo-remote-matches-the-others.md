---
name: new-repo-remote-matches-the-others
description: Giga's repos all push over SSH (git@github.com:… with host aliases per account in ~/.ssh/config). A new repo's remote copied from GitHub's quick-setup page is HTTPS, so `git push` suddenly asks for a username and token. Compare the remote with Giga's other repos before anything else.
metadata:
  type: feedback
---

**In short:** when `git push` prompts `Username for 'https://github.com'`, the remote is
HTTPS while every other repo of Giga's is SSH. Fix the remote; don't make a token.

- GitHub's new-repo page shows the HTTPS URL by default. Pasting it makes `origin` HTTPS, and
  HTTPS ignores SSH keys, so git asks for a login (and only accepts a token as the password).
- Giga's setup: `github.com` uses `~/.ssh/id_rsa`; work accounts use host aliases
  (`git@github-<alias>:org/repo.git`). Use the alias that matches the account that owns the repo.
- Fix (Giga runs it; in auto mode Claude is blocked from repointing a remote):
  `git remote set-url origin git@github.com:<user>/<repo>.git`, then push.

**Why:** 2026-10-15: "I've always been pushing my repos to my own github, what is this now?"
The other repos' `remote get-url` were all `git@…`; the new one was `https://…`.
**How to apply:** any first push of a new repo, and any credential prompt from git.
**Signal:** `Username for 'https://github.com'`, or "why is git asking for a password".
**Next time:** when giving push steps for a new repo, give the SSH URL (or the right alias)
and say "use SSH, not the HTTPS address GitHub shows". Check the branch name too
(`git branch`); don't assume `main`.
