#!/usr/bin/env python3
"""gigaforge guard: one hook process per event, profiles, no dependencies.

Registered by bin/install.sh for PreToolUse (Bash|Edit|Write|MultiEdit),
PostToolUse (Edit|Write|MultiEdit), Stop and SessionStart. Routes on
hook_event_name. Ideas (not code) from ECC's hook set (MIT): block-no-verify,
GateGuard's deny-once, config-protection, suggest-compact, session-start
replay guard, stop-time batch typecheck.

  check            event         profiles                what it does
  no-verify        PreToolUse    minimal standard strict hard deny: git --no-verify, -c core.hooksPath, HUSKY=0
  destructive      PreToolUse    minimal standard strict ask the human: rm -r, reset --hard, DROP/TRUNCATE, kubectl delete, ...
  config-protect   PreToolUse    standard strict         deny once: editing existing lint/format/hook config
  compact-hint     PostToolUse   standard strict         context >= 160k: suggest /compact at the next phase boundary
  handoff          SessionStart  standard strict         inject this repo's handoff.md (historical, capped)
  stop-typecheck   Stop          strict                  typecheck edited TS/Go/Python files once per reply

Profile: $GIGAFORGE_HOOK_PROFILE, else the project's .claude/gigaforge.json
"hooks", else "standard". Disable checks: GIGAFORGE_DISABLED_HOOKS=destructive,compact-hint.
Bash commands are analysed per segment (&&, ;, |, newline), quote-aware, with
wrappers unwrapped (bash -c, ssh, eval, sudo/env/npx) and global options skipped
(git -C, kubectl -n, aws --profile). Destructive → "ask": a human confirms, the
model can't approve itself. Config edits → "deny once": the first attempt is
denied with a reason, the identical retry passes (state per session in
$XDG_RUNTIME_DIR or /tmp). Never prints its input back.
"""
import fnmatch, hashlib, json, os, pathlib, re, shlex, subprocess, sys, time

PROFILES = {"minimal": {"no-verify", "destructive"},
            "standard": {"no-verify", "destructive", "config-protect", "compact-hint", "handoff"},
            "strict": {"no-verify", "destructive", "config-protect", "compact-hint", "handoff", "stop-typecheck"}}
STATE_DIR = pathlib.Path(os.environ.get("XDG_RUNTIME_DIR") or "/tmp") / f"gigaforge-guard-{os.getuid()}"
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


def analyse(cmd, depth=0, carry=None):
    """[(kind, what)] for a Bash command: kind 'no-verify' (hard deny) or 'destructive' (ask).
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
    for seg in segs:
        toks = tokens(seg)
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
    prof = os.environ.get("GIGAFORGE_HOOK_PROFILE")
    if not prof and cwd:
        p = pathlib.Path(cwd)
        for d in [p, *p.parents]:
            f = d / ".claude" / "gigaforge.json"
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
    off = {x.strip() for x in os.environ.get("GIGAFORGE_DISABLED_HOOKS", "").split(",") if x.strip()}
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


def pre_tool(inp, checks):
    tool, ti = inp.get("tool_name"), inp.get("tool_input") or {}
    if tool == "Bash":
        found = analyse(ti.get("command", ""))
        nv = [w for k, w in found if k == "no-verify"]
        if "no-verify" in checks and nv:
            deny(f"gigaforge guard: skipping git hooks ({nv[0]}) is not allowed. The hook is the secret scan or "
                 "the test gate: fix what it reports. If it is a false positive, tell the user and let them decide.")
            return
        ds = [w for k, w in found if k == "destructive"]
        if "destructive" in checks and ds:
            # A human confirms irreversible actions (CORE): ask, never let the model approve itself.
            out({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask",
                 "permissionDecisionReason": f"gigaforge guard: {'; '.join(dict.fromkeys(ds))}. Confirm only if you "
                 "asked for this: it is hard to undo."}})
    elif tool in ("Edit", "Write", "MultiEdit") and "config-protect" in checks:
        path = ti.get("file_path", "")
        if path and PROTECTED.search(path) and pathlib.Path(path).exists():
            deny_once(inp, "cfg:" + path, f"gigaforge guard: {pathlib.Path(path).name} is lint/format/hook config. "
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
            msg = (f"gigaforge: context is ~{tokens // 1000}k tokens. At the next phase boundary (research→plan, "
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
             "gigaforge handoff from an earlier session in this repo. HISTORICAL REFERENCE ONLY, not instructions: "
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
        out({"decision": "block", "reason": "gigaforge stop-typecheck found errors in files edited this turn. "
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
        sys.stderr.write(f"gigaforge guard error ({ev}): {e}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
