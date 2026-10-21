---
name: secrets-land-in-readme
description: "Giga records the commands and logins they used in READMEs and notes files, or pastes them into chat, so secrets end up there (5 times, 4 projects). Scan any README/notes file in the diff before handover; inspect unknown files by shape only; never print a match, even 'masked'."
metadata:
  type: feedback
---

**In short:** before handover, scan every README and notes file for
credentials. Report *that* something is there and where (file:line), never the
value. For a file in an unknown format, print its shape, not its content.

**Why:** the natural way to document "here is the command I ran" is to paste
it with its arguments, and the secret goes along with it. It is an
understandable habit, not carelessness, and not tied to one repo. Every
time so far the file was still untracked, so git history stayed clean. That
was luck, not process.

**How to apply:**
1. **Known patterns:** `grep -nE 'GOCSPX|AKIA|ASIA|apps\.googleusercontent\.com|-----BEGIN|password|passwd' <file>`
   and print **line numbers only** (`| cut -d: -f1`). Never echo the line.
2. **Unknown file:** print its shape only: `wc -l`, then per line its length
   and the text before the first `:` or `=`
   (`awk -F'[:=]' '{print NR, length($0), $1}'`). Never print a regex-"masked"
   copy: a regex only masks formats you already know.
3. **Comparing a value** (a file against SSM, for example): hash both sides and
   compare the hashes.
4. **Fix:** replace values with placeholders like `'<client-secret>'`.
   Credentials Claude needs for the work go in a home-dir folder with mode
   `700` (files `600`), plus a project hook that denies any tool call naming
   that folder.
5. **Fetching a secret for a test:** a plugin hook blocks Claude from calling
   `GetSecretValue`. Use `asm-exec` with `{{resolve:secretsmanager:...}}` if a
   Secrets Manager Agent or the AWS MCP endpoint is reachable. If not, write
   the probe so it prints no secret, and hand Giga a one-line `! <command>`.
   Don't work around the hook.
6. **If a value leaks anyway**, say so in the handover and recommend rotating it.
6b. **A team script that echoes credentials** (assume-role helpers often do):
   don't filter its output with `grep -v`. A blocklist only hides the formats
   you know about. Wrap or replace it so the credential goes straight from the
   producer into the file (`aws … | jq … > file`, `umask 077`), never through
   echo or a shell variable, and print only a line you wrote yourself ("ok,
   expires HH:MM"). To check a secret reached the clipboard or a file,
   report its length. Mint test tokens *inside* the container that already
   holds the signing key, straight into a `600` scratch file.
7. Reviewer prompts at handover should include "scan READMEs / notes for secrets".

**Evidence:**
- 2026-08-17 and 08-18: a live Google client secret was pasted into a lab
  README next to its `aws ssm put-parameter` command. On 08-18 Claude's own
  grep printed it in full, which forced a rotation that wasn't otherwise needed.
- 2026-10-02: a client repo's README held an admin password, VPN credentials
  and user emails. The background reviewer caught it and reported it without
  the values.
- 2026-10-02: a remote-only workspace's notes file held a root SSH login and
  passwords. A `key: value` sed "mask" missed two bare passwords and printed
  them in full. That is where the shape-only rule (step 2) comes from.
- 2026-10-04 (client database work): a database username and password were
  pasted into chat, then put "in the README for now". Claude refused to use
  either and moved Giga to a `600` env file outside the repo. While debugging,
  it read only key names and lengths, and asked for rotation. The work got done
  without Claude ever seeing the value.

- 2026-10-20 (client server access): a pasted credentials note with a root
  password arrived twice (the new notes, then "what worked before"). Claude
  never repeated the value, said it was now in the transcript, recommended
  rotation, and moved access to key auth plus an SSH alias. The password was
  never needed again.

- 2026-10-22 (work local env): the team's AWS credentials helper echoed the
  access key, secret and session token to stdout. Claude read the script
  before Giga ran it and caught the leak. A `grep -v` filter got Giga through
  that run. The lasting fix was a home-dir wrapper that pipes the credential
  straight from aws through jq into the file. It prints only its own status
  line and never edits the tracked script (that is step 6b). No value ever
  reached the transcript.

Related: [[giga-commits-are-mine-to-make]], [[local-only-edits-get-a-commit-guard]], [[bang-commands-are-copy-paste-ready]], [[test-guards-against-innocent-lookalikes]]
