---
name: secrets-land-in-readme
description: "Giga records the commands and logins they used in READMEs and notes files, or pastes them into chat, so secrets end up there (5 times, 4 projects). Scan any README/notes file in the diff before handover; inspect unknown files by shape only; never print a match, even 'masked'."
metadata:
  type: feedback
---

**In short:** before handover, scan every README, notes file and credential-exporting
script for credentials. Report *that* something is there and where (file:line),
never the value. For a file in an unknown format, print its shape, not its content.

**Why:** the natural way to document "here is the command I ran" is to paste it with
its arguments, and the secret goes along. It is an understandable habit, not tied to
one repo. Every time so far the file was still untracked, which was luck, not process.

**How to apply:**
1. **Known patterns:** `grep -nE 'GOCSPX|AKIA|ASIA|apps\.googleusercontent\.com|-----BEGIN|password|passwd' <file>`
   and print **line numbers only** (`| cut -d: -f1`). Never echo the line.
2. **Unknown file:** print its shape only: `wc -l`, then per line its length and the
   text before the first `:` or `=` (`awk -F'[:=]' '{print NR, length($0), $1}'`).
   Never print a regex-"masked" copy: a regex only masks formats you already know
   (2026-10-02: a `key: value` sed "mask" printed two bare passwords in full).
3. **Comparing a value** (a file against SSM, for example): hash both sides.
4. **Fix:** replace values with placeholders like `'<client-secret>'`. Credentials
   Claude needs go in a home-dir folder with mode `700` (files `600`), plus a project
   hook that denies any tool call naming that folder.
5. **Fetching a secret for a test:** a plugin hook blocks `GetSecretValue`. Use
   `asm-exec` with `{{resolve:secretsmanager:...}}` if a Secrets Manager Agent or the
   AWS MCP endpoint is reachable; otherwise write the probe so it prints no secret and
   hand Giga a one-line `! <command>`. Don't work around the hook.
6. **If a value leaks anyway** (pasted into chat, printed by a script), never repeat
   it, say it is now in the transcript, and recommend rotation.
7. **A team script that echoes credentials** (assume-role and SSO helpers often do):
   don't filter it with `grep -v`. Wrap or replace it so the credential goes straight
   from the producer into the file (`aws … | jq … > file`, `umask 077`), never through
   echo or a shell variable, and print only your own status line ("ok, expires HH:MM").
   To check a secret reached the clipboard or a file, report its length. Mint test
   tokens *inside* the container that holds the signing key, into a `600` scratch file.
8. Reviewer prompts at handover include "scan READMEs / notes / scripts for secrets".

**Evidence:** 6 cases, 2026-08-17 → 10-30, across a lab, two client repos and a work
repo: a live OAuth client secret in a README (Claude's own grep printed it, forcing a
rotation), admin/VPN passwords and user emails in a README (caught by the background
reviewer), a root SSH login in a notes file, DB credentials pasted "in the README for
now" (moved to a `600` env file; Claude saw only key names and lengths), a root
password pasted twice (moved to key auth), and two team credential helpers that
echoed session credentials to stdout (one wrapped, one flagged for masking).

Related: [[nothing-leaks]], [[giga-commits-are-mine-to-make]], [[local-only-edits-get-a-commit-guard]], [[bang-commands-are-copy-paste-ready]], [[test-guards-against-innocent-lookalikes]]
