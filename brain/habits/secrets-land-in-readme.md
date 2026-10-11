---
name: secrets-land-in-readme
description: "Giga records the commands and logins they used in READMEs and notes files, or pastes them into chat, so secrets end up there (5 times, 4 projects). Scan any README/notes file in the diff before handover; inspect unknown files by shape only; never print a match, even 'masked'."
metadata:
  type: feedback
---

**Rule:** before handover, scan every README / notes file in the working tree
for credentials. Report *that* something is there and where (file:line), never
the value. Inspecting a file whose format you don't know? Print its shape, not
its content.

**Why:** the natural way to document "here is the command I ran" is to paste
it with its arguments, so the secret goes along with it. It's an understandable
habit, not carelessness, and it's not tied to one repo. Every time so far, the
file was still untracked, so git history stayed clean. That was luck, not process.

**Evidence 2026-10-04 (client DB work):** a DB username and password were pasted into chat, then put "in the
README for now". Claude refused to use either, moved Giga to a 600 env file outside the repo, read only
key names and lengths when debugging, and asked for rotation. It worked without Claude ever seeing the value.

**How to apply:**
1. **Known patterns:** `grep -nE 'GOCSPX|AKIA|ASIA|apps\.googleusercontent\.com|-----BEGIN|password|passwd' <file>`
   and print **line numbers only** (`| cut -d: -f1`). Never echo the line.
2. **Unknown file:** shape only: `wc -l`, then per line its length and the text
   before the first `:`/`=` (`awk -F'[:=]' '{print NR, length($0), $1}'`).
   Never print a regex-"masked" copy. A regex only masks formats you already know.
3. **Comparing a value** (file vs SSM etc.): hash both sides, compare digests.
4. **Fix:** redact to `'<client-secret>'` placeholders. Credentials Claude needs
   for the work go in a `700` home-dir folder (files `600`), plus a project
   hook that denies any tool call naming that folder.
5. **Fetching a secret for a test:** a plugin hook blocks agent-side
   `GetSecretValue`. Use `asm-exec` with `{{resolve:secretsmanager:...}}` if a
   Secrets Manager Agent or the AWS MCP endpoint is reachable. If not, write the
   probe so it prints no secret and hand Giga a one-line `! <command>`.
   Don't route around the hook.
6. **If a value leaks anyway**, say so in the handover and recommend rotation.
7. Reviewer prompts at handover should include "scan READMEs / notes for secrets".

**Evidence:**
- 2026-08-17 and 08-18: a live Google client secret pasted into a lab README next
  to its `aws ssm put-parameter` command. On 08-18 Claude's own grep echoed it
  raw, which forced an otherwise unnecessary rotation.
- 2026-10-02: a client repo's README held an admin password, VPN credentials and
  user emails. The background reviewer caught it and reported it without values.
- 2026-10-02: a remote-only workspace's notes file held a root SSH login and
  passwords. A `key: value` sed "mask" missed two bare passwords and printed
  them in full. That is the origin of the shape-only rule (step 2).

Related: [[giga-commits-are-mine-to-make]], [[test-guards-against-innocent-lookalikes]]
