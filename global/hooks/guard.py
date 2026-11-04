#!/usr/bin/env python3
"""gigabrain guard: one hook process per event, profiles, no dependencies.

Registered by bin/install.sh for PreToolUse (Bash|Edit|Write|MultiEdit|Read|Grep),
PostToolUse (Edit|Write|MultiEdit), Stop and SessionStart. Routes on
hook_event_name. Ideas (not code) from ECC's hook set (MIT): block-no-verify,
GateGuard's deny-once, config-protection, suggest-compact, session-start
replay guard, stop-time batch typecheck.

  check            event         profiles                what it does
  no-verify        PreToolUse    minimal standard strict hard deny: git --no-verify, -c core.hooksPath, HUSKY=0
  destructive      PreToolUse    minimal standard strict ask the human: rm -r, reset --hard, DROP/TRUNCATE, kubectl delete, ...
  secret-read      PreToolUse    minimal standard strict hard deny: Read/Grep or cat/grep/git show/curl/... of .env, keys, credential files
  live-data        PreToolUse    minimal standard strict hard deny, personal account in a work repo only: DB clients,
                                                         AWS data reads, kubectl logs/exec/cp, ssh/scp (account-gate.py)
  config-protect   PreToolUse    standard strict         deny once: editing existing lint/format/hook config
  compact-hint     PostToolUse   standard strict         context >= 160k: suggest /compact at the next phase boundary
  handoff          SessionStart  standard strict         inject this repo's handoff.md (historical, capped)
  stop-typecheck   Stop          strict                  typecheck edited TS/Go/Python files once per reply

Profile: $GIGABRAIN_HOOK_PROFILE, else the project's .claude/gigabrain.json
"hooks", else "standard". Disable checks: GIGABRAIN_DISABLED_HOOKS=destructive,compact-hint.
Bash commands are analysed per segment (&&, ;, |, newline), quote-aware, with
wrappers unwrapped (bash -c, ssh, eval, sudo/env/npx) and global options skipped
(git -C, kubectl -n, aws --profile). Destructive → "ask": a human confirms, the
model can't approve itself. Config edits → "deny once": the first attempt is
denied with a reason, the identical retry passes (state per session in
$XDG_RUNTIME_DIR or /tmp). Never prints its input back.
"""
import fnmatch, hashlib, importlib.util, json, os, pathlib, re, shlex, subprocess, sys, time

PROFILES = {"minimal": {"no-verify", "destructive", "secret-read", "live-data"},
            "standard": {"no-verify", "destructive", "secret-read", "live-data", "config-protect", "compact-hint", "handoff"},
            "strict": {"no-verify", "destructive", "secret-read", "live-data", "config-protect", "compact-hint", "handoff",
                       "stop-typecheck"}}
STATE_DIR = pathlib.Path(os.environ.get("XDG_RUNTIME_DIR") or "/tmp") / f"gigabrain-guard-{os.getuid()}"
HANDOFF_MAX, HANDOFF_DAYS = 4000, 14
COMPACT_AT, COMPACT_STEP = 160_000, 60_000

# ---- Bash analysis: per segment, quote-aware, wrappers unwrapped, global options skipped ----
SEPARATORS = ("&&", "||", ";", "|", "\n", "&")
WRAPPER_PREFIX = {"sudo", "env", "nohup", "time", "nice", "ionice", "stdbuf", "timeout", "xargs", "command", "exec",
                  "npx", "bunx", "dotenv", "doppler", "op", "aws-vault", "with-env", "watch", "retry"}
GROUPING = {"(", "{", "!", "if", "then", "else", "elif", "do", "while", "until", "time"}
PM_BINS = {"prisma", "knex", "typeorm", "sequelize", "drizzle-kit", "cdk", "sls", "serverless", "tsc", "jest", "vitest"}
SSH_VALUE_OPTS = {"-i", "-o", "-l", "-J", "-F", "-p", "-b", "-c", "-D", "-E", "-e", "-L", "-m", "-O", "-Q", "-R", "-S", "-W", "-w"}
VALUE_OPTS = {"-C", "-c", "--git-dir", "--work-tree", "-n", "--namespace", "--context", "--kubeconfig", "--cluster",
              "--user", "--profile", "--region", "--output", "--endpoint-url", "-f", "--file", "-p", "--project-name",
              "--project-directory", "--env-file", "--kube-context", "-H", "--host", "-u", "-d", "--dbname", "-h"}
SAFE_DIRS = {"node_modules", "dist", "build", ".next", "coverage", ".turbo", "cdk.out", ".serverless", "__pycache__",
             ".pytest_cache", "tmp", ".cache", "target", "out", ".nuxt", ".svelte-kit", ".parcel-cache", ".angular",
             "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".venv", "venv", ".mypy_cache", ".ruff_cache",
             ".terraform", "bin", "obj", ".tox", ".nox", "htmlcov", "*.egg-info", ".eggs", "*.pyc", ".gradle",
             ".expo", ".vercel", ".docusaurus", "storybook-static", "*.tsbuildinfo", ".eslintcache"}
DB_CLIENTS = {"psql", "mysql", "mariadb", "sqlite3", "sqlite", "mongosh", "mongo", "cqlsh", "clickhouse-client",
              "duckdb", "pgcli", "mycli"}
DELETE_NO_WHERE = re.compile(r"\bdelete\s+from\s+[\w.\"`\[\]]+\s*(;|$)", re.I)
MONGO_WIPE = re.compile(r"\.(dropDatabase|drop)\s*\(\s*\)|\.(deleteMany|remove)\s*\(\s*\{\s*\}\s*\)")
DROP_TRUNC = re.compile(r"\b(drop\s+(table|database|schema)|truncate\s+(table\s+)?[\w.\"`]+)", re.I)


MAX_CMD = 64_000


def _subst_end(cmd, i):
    """cmd[i:] starts right after '$(' — return index of the matching ')'."""
    depth, q = 1, None
    while i < len(cmd):
        c = cmd[i]
        if q:
            if c == q:
                q = None
            elif c == "\\" and q == '"':
                i += 1
        elif c in "'\"":
            q = c
        elif c == "\\":
            i += 1
        elif c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def scan(cmd):
    """Split a shell command into segments (&& || ; | & newline) outside quotes.
    Skips comments and heredoc bodies; collects $(...) and `...` bodies (they run too).
    Returns (segments, substitutions, ok); ok=False when the quoting can't be parsed."""
    segs, subs, cur, q, i, ok = [], [], [], None, 0, True
    heredocs = []  # delimiters waiting for the end of the current line
    n = len(cmd)
    while i < n:
        c = cmd[i]
        if q == "'":
            cur.append(c)
            if c == "'":
                q = None
            i += 1
            continue
        if c == "$" and cmd.startswith("$(", i) and not cmd.startswith("$((", i):
            end = _subst_end(cmd, i + 2)
            if end < 0:
                return segs, subs, False
            subs.append(cmd[i + 2:end])
            cur.append(cmd[i:end + 1])
            i = end + 1
            continue
        if c == "`":
            end = cmd.find("`", i + 1)
            if end < 0:
                return segs, subs, False
            subs.append(cmd[i + 1:end])
            cur.append(cmd[i:end + 1])
            i = end + 1
            continue
        if q == '"':
            cur.append(c)
            if c == "\\" and i + 1 < n:
                cur.append(cmd[i + 1])
                i += 2
                continue
            if c == '"':
                q = None
            i += 1
            continue
        # outside quotes
        if c == "\\":
            cur.append(cmd[i:i + 2])
            i += 2
            continue
        if c in "'\"":
            q = c
            cur.append(c)
            i += 1
            continue
        if c == "#" and (not cur or cur[-1][-1:] in " \t\n;&|("):
            while i < n and cmd[i] != "\n":
                i += 1
            continue
        if cmd.startswith("<<", i) and not cmd.startswith("<<<", i):
            m = re.match(r"<<(-?)\s*(['\"]?)([A-Za-z_][\w-]*)\2", cmd[i:])
            if m:
                heredocs.append((m.group(3), bool(m.group(1))))
                cur.append(m.group(0))
                i += len(m.group(0))
                continue
        sep = next((s for s in ("&&", "||", "|&", ";;", ";", "|", "\n", "&") if cmd.startswith(s, i)), None)
        if sep == "&" and (cmd[i - 1:i] in (">", "<") or cmd[i + 1:i + 2] == ">"):
            sep = None  # 2>&1, &>file
        if sep:
            segs.append("".join(cur))
            cur = []
            i += len(sep)
            if sep == "\n" and heredocs:  # skip heredoc bodies: data, not commands
                for delim, dash in heredocs:
                    while i < n:
                        j = cmd.find("\n", i)
                        line = cmd[i:j if j >= 0 else n]
                        i = j + 1 if j >= 0 else n
                        if (line.lstrip("\t") if dash else line) == delim:
                            break
                heredocs = []
            continue
        cur.append(c)
        i += 1
    if q:
        ok = False
    segs.append("".join(cur))
    return [s.strip() for s in segs if s.strip()], subs, ok


def tokens(seg):
    try:
        return shlex.split(seg, comments=False)
    except ValueError:
        return seg.split()


def strip_prefix(toks):
    """Drop VAR=val assignments and wrapper commands; return (env_vars, tokens)."""
    envs = {}
    while toks and toks[-1] in (")", "}", "fi", "done", "esac"):
        toks = toks[:-1]
    if toks and toks[-1].endswith(")") and toks[-1].count(")") > toks[-1].count("("):
        toks = toks[:-1] + [toks[-1][:-1]] if toks[-1][:-1] else toks[:-1]
    while toks:
        t = toks[0]
        if t in GROUPING:
            toks = toks[1:]
        elif t.startswith("(") and len(t) > 1:
            toks = [t.lstrip("("), *toks[1:]]
        elif t in ("pnpm", "yarn", "bun", "npm") and len(toks) > 1 and (
                toks[1] in ("exec", "dlx", "x") or t != "npm" and toks[1] in PM_BINS):
            toks = toks[2:] if toks[1] in ("exec", "dlx", "x") else toks[1:]
            if toks and toks[0] == "--":
                toks = toks[1:]
        elif re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", t):
            k, _, v = t.partition("=")
            envs[k] = v
            toks = toks[1:]
        elif os.path.basename(t) in WRAPPER_PREFIX:
            if t == "aws-vault" and toks[1:2] == ["exec"] and "--" not in toks:  # aws-vault exec [opts] prof cmd
                toks = toks[2:]
                while toks and toks[0].startswith("-"):
                    toks = toks[2:] if toks[0] in ("--duration", "-d", "--mfa-token", "-t", "--region", "--prompt") \
                        else toks[1:]
                toks = toks[1:]
                continue
            if t in ("aws-vault", "dotenv", "doppler", "op", "with-env") and "--" in toks:
                toks = toks[toks.index("--") + 1:]  # aws-vault exec prod -- cmd, dotenv -e f -- cmd
                continue
            toks = toks[1:]
            while toks and toks[0].startswith("-"):  # wrapper's own flags (sudo -u x, timeout 30 …)
                toks = toks[2:] if toks[0] in ("-u", "-g", "-s", "-k") else toks[1:]
            while toks and re.match(r"^\d+[smh]?$", toks[0]):  # timeout 30 cmd
                toks = toks[1:]
            if toks and toks[0] == "run" and t in ("doppler", "op", "dotenv"):
                toks = toks[1:]
            if toks and toks[0] == "--":
                toks = toks[1:]
        else:
            break
    return envs, toks


def skeleton(toks):
    """(tool, positionals, flags): global/value options removed so `git -C x reset --hard` reads as reset."""
    tool = os.path.basename(toks[0]) if toks else ""
    pos, flags, i = [], set(), 1
    while i < len(toks):
        t = toks[i]
        if t.startswith("-") and len(t) > 1:
            flags.add(t.split("=", 1)[0])
            if t in VALUE_OPTS and i + 1 < len(toks) and not toks[i + 1].startswith("-"):
                i += 1
        else:
            pos.append(t)
        i += 1
    if tool == "docker-compose":
        tool, pos = "docker", ["compose", *pos]
    return tool, pos, flags


def short_has(flags, letter):
    return any(f.startswith("-") and not f.startswith("--") and letter in f[1:] for f in flags)


def is_tmp(path):
    p = os.path.abspath(os.path.expanduser(os.path.expandvars(path)))
    roots = [os.environ.get("TMPDIR") or "/tmp", "/tmp", "/var/tmp"]
    return any(p == r or p.startswith(r.rstrip("/") + "/") for r in roots) and p.count("/") >= 3


def nested(tool, toks, pos):
    """Commands hidden in wrappers: bash -c "…", ssh host '…', eval '…', kubectl/docker exec … -- cmd."""
    if tool in ("bash", "sh", "zsh", "dash", "ksh"):
        for i, t in enumerate(toks[1:], 1):
            if t.startswith("-") and not t.startswith("--") and "c" in t[1:]:
                return toks[i + 1] if i + 1 < len(toks) else None
        return None
    if tool == "ssh":
        i = 1
        while i < len(toks) and toks[i].startswith("-"):
            i += 2 if toks[i] in SSH_VALUE_OPTS else 1
        return " ".join(toks[i + 1:]) or None
    if tool == "eval":
        return " ".join(toks[1:])
    if tool in ("kubectl", "docker") and "exec" in pos and "--" in toks:
        return shlex.join(toks[toks.index("--") + 1:])
    if tool == "docker" and "exec" in toks:  # docker [compose] exec [opts] CONTAINER cmd...
        i = toks.index("exec") + 1
        while i < len(toks) and toks[i].startswith("-"):
            i += 2 if toks[i] in ("-e", "--env", "-u", "--user", "-w", "--workdir", "--env-file") else 1
        return shlex.join(toks[i + 1:]) or None
    return None


def no_verify(envs, tool, toks, pos, flags):
    if tool != "git":
        return None
    if envs.get("HUSKY") == "0" or {"SKIP_HOOKS", "HUSKY_SKIP_HOOKS"} & set(envs) or "SKIP" in envs and pos[:1] == ["commit"]:
        return "HUSKY=0/SKIP on git"
    if "hookspath" in envs.get("GIT_CONFIG_PARAMETERS", "").lower() or any(
            k.startswith("GIT_CONFIG_KEY_") and v.lower() == "core.hookspath" for k, v in envs.items()):
        return "core.hooksPath via environment"
    sub = pos[0] if pos else ""
    if sub in ("commit", "push", "merge", "rebase", "am", "cherry-pick", "pull") and any(
            len(f) >= 7 and "--no-verify".startswith(f) for f in flags):  # git accepts unambiguous prefixes
        return "--no-verify"
    if sub == "commit":  # -n is --no-verify only for commit; skip the values of -m/-F/-c/-C
        i = toks.index("commit") + 1 if "commit" in toks else len(toks)
        while i < len(toks):
            t = toks[i]
            if t in ("-m", "-F", "-c", "-C", "--author", "--date", "--message", "--file", "--fixup", "--squash"):
                i += 2
                continue
            if t.startswith("-") and not t.startswith("--") and "n" in t[1:].split("m")[0]:
                return "commit -n"
            i += 1
    for j, t in enumerate(toks):
        if t == "-c" and j + 1 < len(toks) and toks[j + 1].lower().startswith("core.hookspath="):
            return "-c core.hooksPath="
    if sub == "config" and any(p.lower() == "core.hookspath" for p in pos):
        k = [p.lower() for p in pos].index("core.hookspath")
        val = pos[k + 1] if k + 1 < len(pos) else None
        if val is not None and (val in ("", "/dev/null") or is_tmp(val) or val.startswith(("/tmp", "/var/tmp"))):
            return "core.hooksPath → nothing"
    return None


def safe_target(t):
    """Build/cache dirs relative to cwd, or something inside the temp dir. Never an absolute system path."""
    t = os.path.expandvars(t)
    if is_tmp(t):
        return True
    rel = not t.startswith(("/", "~", "$")) and ".." not in t.split("/")
    return rel and any(fnmatch.fnmatch(os.path.basename(t.rstrip("/")), pat) for pat in SAFE_DIRS)


def destructive(tool, toks, pos, flags, raw):
    p0, p1 = (pos + ["", ""])[:2]
    if {"--help", "-h"} & flags and tool != "rm" or p0 == "help":
        return None
    if tool == "rm" and (short_has(flags, "r") or short_has(flags, "R") or "--recursive" in flags):
        targets = [t for t in pos if t not in ("--",)]
        if targets and all(safe_target(t) for t in targets):
            return None
        return "recursive delete"
    if tool == "git":
        if p0 == "reset" and "--hard" in flags: return "git reset --hard discards work"
        if p0 == "clean" and (short_has(flags, "f") or "--force" in flags): return "git clean deletes untracked files"
        if p0 in ("checkout", "restore") and "." in pos[1:] and not (
                p0 == "restore" and "--staged" in flags and not {"--worktree", "-W"} & flags):
            return "discards all local changes"
        if p0 in ("checkout", "switch") and ("-f" in flags or "--force" in flags or "--discard-changes" in flags):
            return "discards local changes"
        if p0 == "branch" and ("-D" in flags or ("--delete" in flags and "--force" in flags)): return "force-deletes a branch"
        if p0 == "push" and ({"--force", "-f", "--force-with-lease", "--delete", "-d", "--mirror"} & flags
                             or any(x.startswith((":", "+")) for x in pos[1:])): return "force/delete push on a remote"
        if p0 == "stash" and p1 in ("drop", "clear"): return "drops stashed work"
    if tool == "kubectl" and p0 in ("delete", "drain") or tool == "kubectl" and p0 == "replace" and "--force" in flags:
        return "removes cluster resources"
    if tool == "helm" and p0 in ("uninstall", "delete"): return "removes a release"
    if tool in ("terraform", "tofu", "terragrunt") and (
            p0 == "destroy" or p0 == "apply" and ("-auto-approve" in flags or "-destroy" in flags)
            or p0 == "state" and p1 in ("rm", "replace-provider") or p0 == "workspace" and p1 == "delete"):
        return "changes real infrastructure without a reviewed plan"
    if tool == "pulumi" and (p0 == "destroy" or p0 == "up" and ("--yes" in flags or "-y" in flags)
                             or p0 == "stack" and p1 == "rm"):
        return "changes real infrastructure"
    if tool in ("cdk", "sls", "serverless") and p0 in ("destroy", "remove"): return "tears down a stack"
    if tool == "aws" and (re.search(r"(^|-)(delete|remove|terminate|deregister|purge)-", p1 or "") or
                          p0 == "s3" and (p1 in ("rm", "rb") or p1 == "sync" and "--delete" in flags)):
        return "deletes AWS resources"
    if tool == "docker" and (p1 == "prune" or p0 == "system" and p1 == "prune" or p0 == "volume" and p1 in ("rm", "prune")
                             or p0 in ("rm", "rmi") and (short_has(flags, "f") or "--force" in flags)
                             or p0 == "compose" and p1 == "down" and ({"-v", "--volumes"} & flags)
                             or p0 == "compose" and p1 == "rm" and (short_has(flags, "v") or "--volumes" in flags)):
        return "deletes docker data"
    if tool in ("redis-cli", "valkey-cli") and any(x.lower() in ("flushall", "flushdb") for x in pos):
        return "wipes a Redis keyspace"
    if tool == "dd" and any(x.startswith("of=/dev/") for x in pos) or tool.startswith("mkfs"): return "writes a raw device"
    if tool == "find" and ("-delete" in flags or "-exec" in flags and "rm" in pos) and not (
            {"-name", "-iname", "-path", "-regex"} & flags):  # filtered cleanups (__pycache__, *.log) are routine
        return "bulk delete via find"
    if tool == "chmod" and "-R" in flags and "777" in pos: return "world-writable tree"
    if tool == "gh" and p1 == "delete": return f"deletes a GitHub {p0}"
    if tool == "prisma" and (p0 == "migrate" and p1 == "reset" or p0 == "db" and p1 == "push"
                             and {"--force-reset", "--accept-data-loss"} & flags):
        return "resets the database"
    if tool == "alembic" and p0 == "downgrade": return "downgrades the schema"
    if any(x.endswith("manage.py") for x in [tool, *pos]):
        cmds = [x for x in pos if not x.endswith("manage.py")]
        if cmds[:1] and cmds[0] in ("flush", "reset_db", "sqlflush") or cmds[:1] == ["migrate"] and "zero" in cmds:
            return "wipes the Django database"
    if tool in ("dropdb", "dropuser"): return "drops a database"
    if any(x in ("schema:drop", "db:drop", "db:reset", "migrate:reset", "migration:revert", "migrate:rollback")
           for x in pos):
        return "drops or resets the schema"
    if tool in DB_CLIENTS or tool in ("npm", "pnpm", "yarn", "npx") and "prisma" in pos:
        if DROP_TRUNC.search(raw) or DELETE_NO_WHERE.search(raw) or MONGO_WIPE.search(raw):
            return "drops, truncates or bulk-deletes data"
    return None


# 2026-10-29 (Giga): a personal account may work in a work repo (token limits), but live data stays on
# the work account. These commands pull customer or production data into the transcript.
DB_DUMPERS = {"pg_dump", "pg_dumpall", "mysqldump", "mongodump", "mongoexport", "redis-cli", "valkey-cli"}
REMOTE = {"ssh", "scp", "sftp", "mosh", "autossh", "sshpass", "stern"}  # stern tails k8s logs
LIVE_TOOLS = (DB_CLIENTS | DB_DUMPERS | REMOTE) - {"sqlite3", "sqlite"}  # sqlite: a local file, not a server
RUNNERS = WRAPPER_PREFIX | {"docker", "podman", "nerdctl", "kubectl", "caffeinate", "script", "parallel", "flock",
                            "unbuffer", "chronic", "sshpass", "autossh"}
LIVE_WORD = re.compile(r"(^|[\s;&|(`'\"/])(" + "|".join(sorted(map(re.escape, LIVE_TOOLS | {"aws", "kubectl"}))) + r")\b")
AWS_DATA = {"logs": {"get-log-events", "filter-log-events", "tail", "start-query", "get-query-results",
                     "start-live-tail", "get-log-record"},
            "dynamodb": {"scan", "query", "get-item", "batch-get-item", "execute-statement", "batch-execute-statement",
                         "transact-get-items", "export-table-to-point-in-time"},
            "rds-data": {"execute-statement", "batch-execute-statement"},
            "s3api": {"get-object", "select-object-content"}, "s3": {"presign"},
            "sqs": {"receive-message"}, "kinesis": {"get-records"}, "athena": {"get-query-results"},
            "secretsmanager": {"get-secret-value", "batch-get-secret-value"}, "kms": {"decrypt"},
            "ssm": {"get-parameter", "get-parameters", "get-parameters-by-path", "get-parameter-history",
                    "start-session", "send-command", "get-command-invocation"},
            "cognito-idp": {"list-users", "admin-get-user", "list-users-in-group"},
            "ec2": {"get-console-output"}, "lambda": {"invoke"}, "ecs": {"execute-command"}}
GIT_HOSTS = re.compile(r"^git@(github\.com|gitlab\.com|bitbucket\.org)$")


def aws_live(pos):
    """(service, op) anywhere in the positionals: global options' values (--query X) shift them."""
    for i, x in enumerate(pos[:-1]):
        if pos[i + 1] in AWS_DATA.get(x, ()):
            return f"aws {x} {pos[i + 1]}"
        if x == "s3" and pos[i + 1] in ("cp", "sync", "mv") and any(y.startswith("s3://") for y in pos[i + 2:-1]):
            return f"aws s3 {pos[i + 1]} download"  # an s3:// source; s3:// only as the last arg is an upload
    return None


def live_data(tool, toks, pos, flags):
    p0, p1 = (pos + ["", ""])[:2]
    if {"--help", "--version"} & flags or p0 == "help" or toks[1:] == ["-V"]:  # not -h: --host for psql/mysql
        return None
    if tool in LIVE_TOOLS - REMOTE:
        return f"{tool} reads a database"
    if tool == "aws" and aws_live(pos):
        return f"{aws_live(pos)} reads cloud data"
    if tool in ("sls", "serverless", "sam", "awslogs", "saw", "cw") and (
            "logs" in pos[:2] + [tool] or "invoke" in pos[:1] and p1 != "local"):
        return f"{tool} {p0} reads deployed data"
    if tool == "kubectl" and (p0 in ("logs", "exec", "cp", "attach", "debug") or p0 == "get" and p1.startswith("secret")):
        return f"kubectl {p0} reads from the cluster"
    if tool == "ssh" and "-T" in flags and any(GIT_HOSTS.match(x) for x in pos):
        return None  # ssh -T git@github.com: an auth check, no shell
    if tool in REMOTE or tool == "rsync" and any(":" in x and not x.startswith("/") for x in pos):
        return f"{tool} opens a remote server"
    return None


def via_runner(toks):
    """docker run … psql, xargs -I{} psql, caffeinate psql: a live tool handed to a runner as an argument."""
    i = 0
    while i < len(toks) and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", toks[i]):
        i += 1
    if i < len(toks) and os.path.basename(toks[i]) in RUNNERS:
        hit = next((os.path.basename(t) for t in toks[i + 1:] if os.path.basename(t) in LIVE_TOOLS), None)
        if hit:
            return f"{os.path.basename(toks[i])} runs {hit}"
    return None


def analyse(cmd, depth=0, carry=None):
    """[(kind, what)] for a Bash command: kind 'no-verify' (hard deny), 'destructive' (ask) or 'live-data'.
    Fails closed: anything it can't parse is 'destructive' (a human looks), never silently allowed."""
    if len(cmd) > MAX_CMD:
        return [("destructive", "command too long to analyse safely")]
    segs, subs, ok = scan(cmd)
    if not ok:
        return [("destructive", "unbalanced quoting: could not analyse the command")]
    found, carry = [], dict(carry or {})
    for s in subs:
        if depth < 3:
            found += analyse(s, depth + 1, carry)
        st = tokens(s)  # $(which psql) -c …: the substitution names the tool
        if st[:1] and st[0] in ("which", "command", "whence", "type") and LIVE_TOOLS & set(map(os.path.basename, st)):
            found.append(("live-data", f"$({' '.join(st[:3])}) runs a live-data tool"))
    for seg in segs:
        toks = tokens(seg)
        vr = via_runner(toks)
        if vr:
            found.append(("live-data", vr))
        if toks and toks[0] == "export":  # export HUSKY=0; git commit …
            carry.update(dict(x.split("=", 1) for x in toks[1:] if "=" in x))
            continue
        envs, toks = strip_prefix(toks)
        if not toks:
            continue
        envs = {**carry, **envs}
        tool, pos, flags = skeleton(toks)
        inner = nested(tool, toks, pos)
        if inner and depth < 3:
            found += analyse(inner, depth + 1, carry)
        nv = no_verify(envs, tool, toks, pos, flags)
        if nv:
            found.append(("no-verify", nv))
        d = destructive(tool, toks, pos, flags, seg)
        if d:
            found.append(("destructive", d))
        ld = live_data(tool, toks, pos, flags)
        if ld:
            found.append(("live-data", ld))
    return found


PROTECTED = re.compile(r"(^|/)(\.eslintrc(\.\w+)?|eslint\.config\.[cm]?[jt]s|\.prettierrc(\.\w+)?|prettier\.config\.[cm]?[jt]s|"
                       r"\.prettierignore|\.eslintignore|biome\.jsonc?|\.stylelintrc(\.\w+)?|commitlint\.config\.[cm]?[jt]s|"
                       r"\.golangci\.ya?ml|ruff\.toml|\.ruff\.toml|\.flake8|mypy\.ini|\.pre-commit-config\.yaml|"
                       r"\.husky/[^/]+|\.githooks/[^/]+|\.lintstagedrc(\.\w+)?|lint-staged\.config\.[cm]?js)$")
TYPECHECK_EXT = (".ts", ".tsx", ".mts", ".cts", ".go", ".py")


def out(obj):
    sys.stdout.write(json.dumps(obj))
    sys.stdout.flush()


def deny(reason):
    out({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                "permissionDecisionReason": reason}})


def profile_checks(cwd):
    prof = os.environ.get("GIGABRAIN_HOOK_PROFILE")
    if not prof and cwd:
        p = pathlib.Path(cwd)
        for d in [p, *p.parents]:
            f = d / ".claude" / "gigabrain.json"
            if f.exists():
                try:
                    req = json.loads(f.read_text())
                    prof = req.get("hooks") if isinstance(req, dict) else None
                except (OSError, json.JSONDecodeError, UnicodeDecodeError):
                    pass
                break
            if (d / ".git").exists():
                break
    checks = set(PROFILES.get(prof or "standard", PROFILES["standard"]))
    off = {x.strip() for x in os.environ.get("GIGABRAIN_DISABLED_HOOKS", "").split(",") if x.strip()}
    return checks - off


def state(session):
    STATE_DIR.mkdir(mode=0o700, exist_ok=True)
    f = STATE_DIR / f"{re.sub(r'[^A-Za-z0-9_-]', '', session or 'nosession')[:64]}.json"
    try:
        return f, json.loads(f.read_text())
    except (OSError, json.JSONDecodeError):
        return f, {}


def save(f, data):
    try:
        f.write_text(json.dumps(data))
    except OSError:
        pass  # can't persist: deny-once then degrades to allow on retry rather than looping forever


def sweep():
    try:
        cutoff = time.time() - 3 * 86400
        for f in STATE_DIR.glob("*.json"):
            if f.stat().st_mtime < cutoff:
                f.unlink()
    except OSError:
        pass


def deny_once(inp, key, reason):
    """Deny the first attempt (with reason); the identical retry is allowed."""
    f, st = state(inp.get("session_id"))
    seen = st.setdefault("denied", [])
    h = hashlib.sha256(key.encode()).hexdigest()[:16]
    if h in seen:
        return False
    seen.append(h)
    st["denied"] = seen[-200:]
    save(f, st)
    deny(reason)
    return True


# 2026-10-29 (Giga: "nothing leaks"): a secret's value must never enter the transcript. Key names are
# fine (`cut -d= -f1 .env`, `grep -c KEY .env`), and so are loaders and local copies (`source .env`,
# `cp .env.example .env`); printing, searching, diffing or uploading the file is not.
SECRET_FILE = re.compile(r"(^|/)(\.env(\.[\w.*-]+|\*)?|\.envrc|\.npmrc|\.pypirc|\.netrc|\.pgpass|id_(rsa|dsa|ecdsa|ed25519)|"
                         r"[^/]*credentials(\.json)?|secrets?\.(ya?ml|json)|[^/]*\.tfvars|"
                         r"[^/]*\.(pem|p12|pfx|key|keystore|jks)|\.kube/config|\.docker/config\.json)$")
SECRET_SAFE = re.compile(r"\.(example|sample|template|dist|defaults?)$|(^|/)\.env\.(example|sample|template)|"
                         r"(^|/)(fullchain|chain|ca|cacert|cert)[^/]*\.pem$")
SECRET_READERS = {"cat", "bat", "head", "tail", "less", "more", "nl", "tac", "strings", "xxd", "od", "hexdump",
                  "base64", "scp", "rsync", "curl", "wget", "awk", "sed", "grep", "rg", "cut", "sort", "uniq",
                  "column", "jq", "yq", "python", "python3", "node", "ruby", "perl", "open", "pbcopy", "diff",
                  "gpg", "zip", "tar", "nc", "vim", "vi", "nano", "code", "echo", "printf"}
GIT_READS = {"show", "diff", "log", "cat-file", "grep", "blame"}
SHELLS = {"bash", "sh", "zsh"}


def secret_path(t):
    t = t or ""
    t = t.split("=", 1)[1] if t.startswith("-") and "=" in t else t
    t = t.lstrip("@<")  # curl -d @.env, input redirection
    if ":" in t and "://" not in t:
        t = t.rsplit(":", 1)[1]  # git show HEAD:.env
    return bool(SECRET_FILE.search(t)) and not SECRET_SAFE.search(t)


def secret_reads(cmd, depth=0):
    """'<reader> <secret file>' pairs in a Bash command, per ;/&&/|/newline segment, looking inside
    $(...), backticks, subshells, braces and `bash -c '...'`. An accident guard, not a sandbox."""
    if len(cmd) > 20_000:  # shlex is slow on huge input; fail closed on any secret-looking name instead
        return ["(long command) secret file"] if re.search(r"\.env\b(?!\.(example|sample|template))|id_(rsa|ed25519)|\.pem\b", cmd) else []
    flat = re.sub(r"\$\(|[`(){}\n]", " ; ", cmd)
    try:
        lex = shlex.shlex(flat, posix=True, punctuation_chars=";&|")
        lex.whitespace_split = True
        toks = list(lex)
    except ValueError:
        return []
    segs, cur = [], []
    for t in toks:
        if t and set(t) <= set(";&|"):
            segs.append(cur); cur = []
        else:
            cur.append(t)
    segs.append(cur)
    hits = []
    for seg in segs:
        hits += [f"< {pathlib.Path(b).name}" for a, b in zip(seg, seg[1:]) if a == "<" and secret_path(b)]
        seg = [t for t in seg if not re.match(r"^[A-Za-z_]\w*=", t)]
        while seg and seg[0] in ("sudo", "env", "command", "nice", "time", "xargs", "nohup", "timeout"):
            seg = seg[2:] if seg[0] == "timeout" and len(seg) > 1 and re.match(r"^[\d.]+[smhd]?$", seg[1]) else seg[1:]
        if not seg:
            continue
        prog = os.path.basename(seg[0])
        if prog in SHELLS and "-c" in seg and depth < 2:
            i = seg.index("-c")
            hits += secret_reads(seg[i + 1], depth + 1) if i + 1 < len(seg) else []
            continue
        if prog == "git":
            sub = next((t for t in seg[1:] if not t.startswith("-")), "")
            if sub not in GIT_READS:
                continue
        elif prog not in SECRET_READERS:
            continue
        if prog == "grep" and any(re.match(r"^-[A-Za-z]*[clqL]", t) for t in seg[1:]):
            continue  # count / list / quiet: no values printed
        if prog == "rg" and any(re.match(r"^-[A-Za-z]*[clq]", t) or t == "--files-with-matches" for t in seg[1:]):
            continue
        if prog == "cut" and any(re.match(r"^(-f|--fields=?)1$", t) or t == "-f1" for t in seg[1:]):
            continue  # cut -d= -f1: key names only
        hits += [f"{prog} {pathlib.Path(t.lstrip('@<')).name}" for t in seg[1:] if secret_path(t)]
    return hits


def cd_targets(cwd, cmd):
    """Directories a Bash command moves into (cd/pushd), resolved against cwd."""
    out = []
    for seg in scan(cmd)[0] if cmd and len(cmd) <= MAX_CMD else []:
        t = tokens(seg)
        if len(t) > 1 and t[0] in ("cd", "pushd"):
            out.append(os.path.join(cwd, os.path.expanduser(t[-1])))
    return out


def personal_mode(cwd, cmd=""):
    """account-gate.py's mode is 'personal' here or in any directory the command cd's into.
    Fails closed: if the gate can't answer, assume personal."""
    cwd = cwd or os.getcwd()
    try:
        spec = importlib.util.spec_from_file_location("account_gate", pathlib.Path(__file__).resolve().parent / "account-gate.py")
        gate = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(gate)
        return any(gate.mode(d) == "personal" for d in [cwd, *cd_targets(cwd, cmd)])
    except Exception:
        return True


# 2026-10-29 (reviewer): in personal mode the model must not switch the guard off. `--mark-work` would record the
# personal org as work, deleting a registry turns the mode off, ~/.claude.json holds the org (and the email),
# settings files hold the hooks. Giga's own `! cmd` doesn't pass PreToolUse, so his path stays open.
TAMPER = re.compile(r"account-gate\.py|accounts\.local\.json|projects\.local\.json|gigabrain/global/hooks|"
                    r"\.claude\.json|\.claude/settings[\w.-]*\.json|claude_desktop_config")


def pre_tool(inp, checks):
    tool, ti = inp.get("tool_name"), inp.get("tool_input") or {}
    if "live-data" in checks:
        text = ti.get("command") if tool == "Bash" else " ".join(
            str(ti.get(k) or "") for k in ("file_path", "path", "glob", "notebook_path"))
        if text and TAMPER.search(text) and personal_mode(inp.get("cwd"), text if tool == "Bash" else ""):
            deny("gigabrain guard: personal mode (a personal Claude account in a work repo) can't touch the account "
                 "gate, its registries, ~/.claude.json or Claude settings. Giga changes these with `! cmd` or "
                 "on the work account. Never work around this.")
            return
    if "secret-read" in checks:
        if tool == "Bash":
            hits = secret_reads(ti.get("command") or "")
        elif tool in ("Read", "Grep"):  # Grep in content mode prints values just like Read
            paths = [ti.get("file_path"), ti.get("path"), ti.get("glob")]
            hits = [pathlib.Path(x).name for x in paths if x and secret_path(x)]
        else:
            hits = []
        if hits:
            deny(f"gigabrain guard: {hits[0]} would put a secret's value into the transcript (rule: nothing leaks). "
                 "Read key names only (`cut -d= -f1 <file>`, `grep -c KEY <file>`), or ask the user to check the "
                 "value themselves. Never work around this.")
            return
    if tool == "Bash":
        found = analyse(ti.get("command", ""))
        nv = [w for k, w in found if k == "no-verify"]
        if "no-verify" in checks and nv:
            deny(f"gigabrain guard: skipping git hooks ({nv[0]}) is not allowed. The hook is the secret scan or "
                 "the test gate: fix what it reports. If it is a false positive, tell the user and let them decide.")
            return
        ld = [w for k, w in found if k == "live-data"]
        cmd = ti.get("command") or ""
        if not ld and any(w.startswith(("unbalanced", "command too long")) for _, w in found) and LIVE_WORD.search(cmd):
            ld = ["an unparsable command naming a live-data tool"]  # else a human could approve it as "destructive"
        if "live-data" in checks and ld and personal_mode(inp.get("cwd"), cmd):
            deny(f"gigabrain guard: {ld[0]}, and this work repo is on a personal Claude account (personal mode). "
                 "Live data stays on the work account (rule: nothing leaks). Ask Giga to run it there or switch "
                 "with /login. Never work around this (wrapper scripts, npm scripts, curl to the same data).")
            return
        ds = [w for k, w in found if k == "destructive"]
        if "destructive" in checks and ds:
            # A human confirms irreversible actions (CORE): ask, never let the model approve itself.
            out({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask",
                 "permissionDecisionReason": f"gigabrain guard: {'; '.join(dict.fromkeys(ds))}. Confirm only if you "
                 "asked for this: it is hard to undo."}})
    elif tool in ("Edit", "Write", "MultiEdit") and "config-protect" in checks:
        path = ti.get("file_path", "")
        if path and PROTECTED.search(path) and pathlib.Path(path).exists():
            deny_once(inp, "cfg:" + path, f"gigabrain guard: {pathlib.Path(path).name} is lint/format/hook config. "
                      "Loosening it to make a check pass hides the problem: fix the code instead. If changing this "
                      "config IS the task (the user asked for it), say so in one line and retry the same edit.")


def last_context_tokens(transcript):
    try:
        with open(transcript, "rb") as fh:
            fh.seek(0, 2)
            fh.seek(max(0, fh.tell() - 200_000))
            tail = fh.read().decode(errors="ignore").splitlines()
    except OSError:
        return 0
    for line in reversed(tail):
        if '"usage"' not in line:
            continue
        try:
            u = json.loads(line).get("message", {}).get("usage") or {}
        except json.JSONDecodeError:
            continue
        if u:
            return u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
    return 0


def post_tool(inp, checks):
    if inp.get("agent_id"):
        return  # subagent: its context is not the main one
    f, st = state(inp.get("session_id"))
    path = (inp.get("tool_input") or {}).get("file_path", "")
    if "stop-typecheck" in checks and path.endswith(TYPECHECK_EXT):
        st["edited"] = sorted(set(st.get("edited", [])) | {path})[-200:]
    msg = None
    if "compact-hint" in checks and inp.get("transcript_path"):
        tokens = last_context_tokens(inp["transcript_path"])
        at = COMPACT_AT if tokens < 230_000 else 250_000  # past ~230k it is a 1M-window session
        nxt = st.get("compact_next", at)
        if tokens >= nxt:
            st["compact_next"] = tokens + COMPACT_STEP
            msg = (f"gigabrain: context is ~{tokens // 1000}k tokens. At the next phase boundary (research→plan, "
                   "plan→build, after a debug loop or a failed approach; never mid-change), write the plan/state to a "
                   "file and suggest /compact to the user.")
    save(f, st)
    if msg:
        out({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": msg}})


def git_common(cwd):
    r = subprocess.run(["git", "-C", cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"],
                       capture_output=True, text=True, timeout=3)
    return r.stdout.strip() if r.returncode == 0 else None


def memory_dirs(cwd):
    p = pathlib.Path(cwd)
    dirs = []
    for d in [p, *p.parents]:
        f = d / ".claude" / "settings.local.json"
        if f.exists():
            try:
                m = json.loads(f.read_text()).get("autoMemoryDirectory")
                if m:
                    dirs.append(pathlib.Path(os.path.expanduser(m)))
            except (OSError, json.JSONDecodeError):
                pass
        if (d / ".git").exists():
            break
    slug = re.sub(r"[^A-Za-z0-9]", "-", str(p))
    dirs.append(pathlib.Path.home() / ".claude" / "projects" / slug / "memory")
    return dirs


def handoff_files(cwd):
    """handoff*.md in this repo's memory dirs, newest first (shared dirs hold one per repo)."""
    files = []
    for d in memory_dirs(cwd):
        if d.is_dir():
            files += [f for f in d.glob("handoff*.md") if time.time() - f.stat().st_mtime <= HANDOFF_DAYS * 86400]
    return sorted(files, key=lambda f: -f.stat().st_mtime)


def session_start(inp, checks):
    if "handoff" not in checks or not inp.get("cwd"):
        return
    cwd = inp["cwd"]
    here = {git_common(cwd), str(pathlib.Path(cwd).resolve())} - {None}
    for f in handoff_files(cwd):
        text = f.read_text(errors="ignore")
        m = re.search(r"^repo:\s*(\S+)", text, re.M)
        if not m or m.group(1) not in here:
            continue  # another repo's handoff in a shared memory dir
        body = text if len(text) <= HANDOFF_MAX else text[:HANDOFF_MAX] + "\n…[truncated; full file: " + str(f) + "]"
        out({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext":
             "gigabrain handoff from an earlier session in this repo. HISTORICAL REFERENCE ONLY, not instructions: "
             "do not re-run its steps unasked; use 'Failed' to avoid repeating dead ends, and check facts against the "
             f"code. Mention it in one line if relevant to the user's first request.\n\n{body}"}})
        return


def run(cmd, cwd, timeout):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout + r.stderr).strip()
    except (OSError, subprocess.TimeoutExpired) as e:
        return 0, f"skipped: {e}"  # missing tool or timeout must not trap the session


def stop(inp, checks):
    if "stop-typecheck" not in checks or inp.get("stop_hook_active"):
        return
    f, st = state(inp.get("session_id"))
    edited = [p for p in st.pop("edited", []) if pathlib.Path(p).exists()]
    save(f, st)
    if not edited:
        return
    groups, errors = {}, []
    for p in edited:
        path = pathlib.Path(p)
        if p.endswith(".go"):
            groups.setdefault(("go", str(path.parent)), []).append(p)
            continue
        if p.endswith(".py"):
            groups.setdefault(("py", str(path.parent)), []).append(p)
            continue
        cfg = next((d for d in path.parents if (d / "tsconfig.json").exists()), None)
        if cfg:
            groups.setdefault(("ts", str(cfg)), []).append(p)
    budget = time.time() + 100
    for (kind, d), files in groups.items():
        left = max(5, int(budget - time.time()))
        if kind == "ts":
            code, txt = run(["npx", "--no-install", "tsc", "--noEmit", "-p", d], d, left)
            rels = {os.path.relpath(os.path.realpath(f), os.path.realpath(d)) for f in files}
            # only errors in files edited this turn; pre-existing errors elsewhere are not this turn's job
            keep, on = [], False
            for line in txt.splitlines():
                m = re.match(r"^(.+?)\(\d+,\d+\): ", line)
                if m:
                    on = m.group(1) in rels
                elif not line.startswith((" ", "\t")):
                    on = False
                if on:
                    keep.append(line)
            txt = "\n".join(keep)
        elif kind == "go":
            code, txt = run(["go", "vet", "."], d, left)
        else:
            code, txt = run(["ruff", "check", "--quiet", *files], d, left) if shutil_which("ruff") else (0, "")
        if code and txt and not txt.startswith("skipped"):
            errors.append(f"[{kind} {d}]\n" + "\n".join(txt.splitlines()[:25]))
    if errors:
        out({"decision": "block", "reason": "gigabrain stop-typecheck found errors in files edited this turn. "
             "Fix them (or say why they are pre-existing) before finishing:\n\n" + "\n\n".join(errors)[:6000]})


def shutil_which(x):
    return any(os.access(os.path.join(p, x), os.X_OK) for p in os.environ.get("PATH", "").split(os.pathsep))


def main():
    try:
        raw = sys.stdin.read(2_000_000)
        inp = json.loads(raw) if raw.strip() else {}
    except (json.JSONDecodeError, UnicodeDecodeError):
        return 0  # unreadable input: advisory checks fail open
    if not isinstance(inp, dict):
        return 0
    ev = inp.get("hook_event_name", "")
    try:
        checks = profile_checks(inp.get("cwd"))
        if ev == "PreToolUse":
            pre_tool(inp, checks)
        elif ev == "PostToolUse":
            post_tool(inp, checks)
        elif ev == "SessionStart":
            session_start(inp, checks)
            sweep()
        elif ev == "Stop":
            stop(inp, checks)
    except Exception as e:  # a bug in the guard must never wedge a session
        sys.stderr.write(f"gigabrain guard error ({ev}): {e}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
