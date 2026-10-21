---
name: dev-secrets-live-in-the-password-manager
description: "Onboarding a local dev env without leaks (resolved compose config / build args / docker history print secrets: show keys only; prefer op run masking): tokens stay in 1Password and load per terminal via a shell function (not op read in .zshrc, which prompts in every agent shell); import downloaded key files via stdin, verify, then delete; gate `op` behind an ask rule; MFA/sudo steps go in a real terminal because Claude's `!` has no TTY."
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

- 2026-10-21, same env, a real leak *by Claude*: debugging a build, Claude
  printed the `build.args` of `docker-compose config --format json`. The resolved
  config interpolates `${TOKEN}`, so the value went into the transcript. The
  token had to be rotated (verified: new token `whoami` OK, old one 401).
  Afterwards `op run --env-file <refs>` replaced the exported variables: the
  secret exists only inside one command, and 1Password masks it in any output.

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

9. **Resolved config is a secret dump.** `compose config`, `docker inspect`,
   `docker history`, build args, `env`/`printenv` all show interpolated values.
   Print key names or counts only (`jq 'keys'`, `grep -c npm_`), never values.
10. **Prefer `op run` to exports:** a refs-only env file (`KEY="op://…"`, mode 600)
    plus a wrapper (`dc() { op run --env-file ~/.config/<proj>/op.env -- docker-compose "$@"; }`).
    Nothing lives in the shell, and output is masked even when a command echoes it.
11. **After a leak:** say so at once, rotate, then prove it (new works, old 401, no-cache build).

**Signal:** a new environment needs tokens, cloud keys or MFA.
**Next time:** password manager → `op run` wrapper → ask rules → verify by shape, never dump resolved config; MFA in a real terminal.
