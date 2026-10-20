---
name: two-github-accounts-one-mac
description: "GitHub picks the account from the SSH key offered, and ~/.ssh/config's IdentityFile for github.com is still offered even when you pass -i, so a personal repo pushes as the work account. Pin the personal key per repo with core.sshCommand using -F /dev/null, and test keys with -F /dev/null before concluding anything."
metadata:
  type: project
---

**In short:** with a work and a personal GitHub account on one Mac, give each
its own key and pin the personal one **per repo**. Never trust an `ssh -T`
result taken with the normal config loaded.

**Why:** 2026-10-20, a push to Giga's personal repo failed as "denied to
<work-account>":
- An earlier session had pinned the work RSA key for `github.com` in
  `~/.ssh/config` (an admin had asked for RSA), and the existing ed25519 key was
  *also* registered to the work account. So every key on the Mac resolved to the work account.
- A new personal key was added to the personal account, but
  `ssh -i <personal> -o IdentitiesOnly=yes -T git@github.com` still answered
  as the work account, because the config's `IdentityFile` was offered too, and
  first. I wrongly concluded the key sat on the wrong account. The same probe
  with `-F /dev/null` answered as the personal account.
- GitHub refuses one key on two accounts, so "just reuse id_ed25519" can't work
  while it's on the work account.

**How to apply:**
1. Ask which account a key belongs to with `ssh -F /dev/null -i <key> -o IdentitiesOnly=yes -T git@github.com`.
2. Create a dedicated key for the second account (`ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_personal`)
   and add its `.pub` while signed in as *that* account (a private window helps).
3. Pin it to the repo:
   `git -C <repo> config core.sshCommand "ssh -F /dev/null -i ~/.ssh/id_ed25519_personal -o IdentitiesOnly=yes"`.
   Work repos keep the global config untouched. If many personal repos appear,
   switch to a `Host github-personal` alias instead.
4. Prefer ed25519; use RSA-4096 only where a system requires it.

**Signal:** "Permission to <owner>/<repo> denied to <other-account>" on push.
**Next time:** probe the key with `-F /dev/null` → dedicated key → per-repo `core.sshCommand`.
