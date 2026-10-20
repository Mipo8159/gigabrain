---
name: dev-secrets-live-in-the-password-manager
description: "Onboarding a local dev env without leaks: tokens stay in 1Password and load per terminal via a shell function (not op read in .zshrc, which prompts in every agent shell); import downloaded key files via stdin, verify, then delete; gate `op` behind an ask rule; MFA/sudo steps go in a real terminal because Claude's `!` has no TTY."
metadata:
  type: feedback
---

**In short:** when Giga sets up a new environment, secrets go into the
password manager first. Then they reach the shell only on demand, and Claude
never sees a value.

**Why:** 2026-10-19, first day on a work repo. Giga asked for "everything
secured and without leaks, as much as possible". What worked, and what went wrong:
- Giga saved tokens in 1Password but nothing exported them; the shell check
  caught it twice ("added it" ≠ loaded).
- `op read` in `.zshrc` would have prompted Touch ID in every new shell,
  including every command Claude runs. A `tl-env()` function run once per
  terminal avoided that.
- An `op://…` reference rejected an em dash in the item title; renaming the
  item fixed it.
- An AWS key CSV was downloaded in the expectation that 1Password would pick
  it up (it doesn't). Claude imported it through stdin, checked the item
  matched the CSV field by field, then deleted the CSV.
- Giga then chose a plain `~/.aws/credentials` after hearing the trade-off.
  It was written from 1Password with mode 600 in a 700 folder.
- `! aws … --profile <mfa-role>` failed with an empty error: Claude's `!`
  runs without a TTY, so it can't read an MFA code.

**How to apply:**
1. **Store first:** each token goes into the password manager (personal vault,
   not a shared team vault) before it touches the shell.
2. **Load on demand:** a shell function (`<proj>-env() { export X="$(op read 'op://Vault/Item/field')"; }`),
   run once per terminal. Keep item titles to plain ASCII.
3. **Gate the CLI:** user-level ask rules for `Bash(op:*)`, `printenv`, `env`,
   and deny `Read` on generated-secret folders, so every secret read needs a click.
4. **Downloaded key files:** pipe them into `op item create` through stdin, compare the
   stored fields with the file (print only true/false), then delete the file.
5. **Verify without printing:** lengths, prefixes (`npm_`), `whoami`, HTTP status codes.
   Never print a value.
6. **Interactive auth (MFA, sudo):** hand Giga the command for a real terminal. Wrap long
   runs in `script -q <log> <cmd>` so Claude can read the log afterwards while the
   prompts still work.
7. **A denied read is the guard working.** Never retry `ls`/`cat` variants of a denied
   path. Hand Giga a `! <command>` that prints shape only, or ask. Missed sessions on
   2026-10-19 retried `~/.ssh` reads 4 times after a deny.
8. **Plaintext is Giga's call:** argue the cost (long-lived key, readable by every
   npm postinstall script), name what would change your mind, then do what Giga picks, safely.

**Signal:** a new environment needs tokens, cloud keys or MFA.
**Next time:** password manager → per-terminal loader → ask rules → verify by shape; MFA in a real terminal.
