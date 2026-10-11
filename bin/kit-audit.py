#!/usr/bin/env python3
"""Security scan of Claude Code configuration (AgentShield-style, stdlib only).

    bin/kit-audit.py              global: ~/.claude + ~/.claude.json MCP + installed plugins' MCP
    bin/kit-audit.py <repo>       global + that project
    bin/kit-audit.py --all        global + every project in kit/projects.json
    add --json for machine output

Never prints a secret value: findings show file:line and the rule only.
Exit 1 if any critical/high finding is not accepted in kit/audit-accept.json
({"rule", "path_glob", "reason"}; path is shown with ~ for $HOME).
Rules adapted from ECC's security guide / AgentShield notes and CI scripts (MIT).
"""
import fnmatch, hashlib, json, os, pathlib, re, sys

G = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
CL = HOME / ".claude"
SEV_ORDER = {"critical": 0, "high": 1, "medium": 2, "info": 3}
TEXT_EXT = {".md", ".json", ".sh", ".py", ".js", ".mjs", ".cjs", ".ts", ".yml", ".yaml", ".toml", ".txt", ""}
MAX_BYTES = 1_000_000

SECRETS = {
    "aws-access-key": r"\b(AKIA|ASIA)[A-Z0-9]{16}\b",
    "anthropic-key": r"sk-ant-[A-Za-z0-9_-]{20,}",
    "openai-key": r"\bsk-(proj-)?[A-Za-z0-9]{32,}",
    "github-token": r"\bgh[pousr]_[A-Za-z0-9]{30,}",
    "slack-token": r"\bxox[baprs]-[A-Za-z0-9-]{10,}",
    "google-oauth-secret": r"GOCSPX-[A-Za-z0-9_-]{10,}",
    "private-key": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "assigned-secret": r"(?i)(password|passwd|secret|api_?key|token)[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9/+_-]{12,}",
    "bearer-token": r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{16,}",
    "url-credentials": r"\b[a-z][\w+.-]*://[^/\s:@]+:[^/\s@]{6,}@|\b[a-z][\w+.-]*://[^/\s:@]*(token|oauth|x-access)[^/\s@]*@",
}
SECRETS = {k: re.compile(v) for k, v in SECRETS.items()}
INJECTION = re.compile(r"(?i)\b(ignore (all )?(previous|prior|above) (instructions|rules)|disregard (all |the )?(previous|above|prior)"
                       r"|(run|execute|install|delete|remove|push|deploy|send|upload)\b[^.\n]{0,40}\bwithout (asking|confirmation|confirming)"
                       r"|(always|automatically) (run|execute)\b[^.\n]{0,40}\b(without|no need to) (ask|confirm)"
                       r"|do not (tell|inform|mention (it |this )?to) the user|bypass (the )?permission)")
# "Never run X without asking" is a safety rule, not an injection: skip phrases negated earlier in the line.
NEGATED = re.compile(r"(?i)\b(never|don't|do not|must not|mustn't|shouldn't|should not|no one may|avoid)\b[^.!?\n]*$")
# Documented examples, not credentials: truncated tokens ("eyJhb..."), <angle> slots, ${VARS}, and the
# stock dev passwords in compose/connection-string examples. Only for the shape-based rules below;
# provider-prefixed keys (AKIA, sk-ant-, ghp_) are never excused this way.
PLACEHOLDER_RULES = {"assigned-secret", "bearer-token", "url-credentials"}
PLACEHOLDER = re.compile(r"(?i)(xxx|<[^>]+>|\$\{|\$\(|your[_-]|example|changeme|placeholder|\*\*\*|\.\.\.|…"
                         r"|://[^:/@\s]+:(postgres|password|pass|secret|test|dev\w*|local\w*|admin|root|guest|app)@)")
QUOTES = "\"\u201c\u201d"
USERINFO = re.compile(r"\b([a-z][\w+.-]*://)[^/\s@]+@", re.I)


def redact(s):
    """Nothing a finding prints may carry a credential: strip URL userinfo, mask key-shaped values."""
    s = USERINFO.sub(r"\1***@", str(s))
    for rx in SECRETS.values():
        s = rx.sub(lambda m: m.group(0)[:4] + "***", s)
    return re.sub(r"[A-Za-z0-9_\-]{32,}", lambda m: m.group(0)[:4] + "***", s)


def quoted(line, start):
    """A phrase quoted as an example ("ignore previous instructions") is a warning, not an instruction."""
    return sum(line[:start].count(q) for q in QUOTES) % 2 == 1
HIDDEN = re.compile("[​‌‎‏‪-‮⁠-⁤⁦-⁩]|(?<!^)﻿")
HTML_CMT = re.compile(r"<!--(.*?)-->", re.S)
CMT_BAD = re.compile(r"(?i)\b(ignore|disregard|execute|curl|wget|exfiltrat|send (it|this|them|the \w+) to|do not (tell|mention))\b")
B64 = re.compile(r"[A-Za-z0-9+/]{200,}={0,2}")
EXFIL = re.compile(r"\b(curl|wget|nc|ncat|scp|ssh|base64)\b")
PIPE_SH = re.compile(r"\|\s*(ba|z|da)?sh\b")


class Audit:
    def __init__(self):
        self.findings, self.seen = [], set()
        self.allow_fp = set()
        f = G / ".githooks/secret-allowlist"
        if f.exists():
            self.allow_fp = {l.strip() for l in f.read_text().splitlines() if l.strip() and not l.startswith("#")}
        acc = G / "kit/audit-accept.json"
        self.accept = json.loads(acc.read_text()) if acc.exists() else []

    def add(self, rule, sev, path, line=None, msg=""):
        disp = show(path)
        msg = redact(msg)  # every rule's message goes through here, text and --json alike
        key = (rule, disp, line, msg)
        if key in self.seen:
            return
        self.seen.add(key)
        acc = next((a for a in self.accept if a["rule"] == rule and fnmatch.fnmatch(disp, a["path_glob"])), None)
        self.findings.append({"rule": rule, "severity": sev, "path": disp, "line": line, "msg": msg,
                              "accepted": acc["reason"] if acc else None})


def show(p):
    s = str(p)
    return "~" + s[len(str(HOME)):] if s.startswith(str(HOME)) else s


def read(p):
    try:
        p = pathlib.Path(p)
        if p.stat().st_size > MAX_BYTES or p.suffix not in TEXT_EXT:
            return None
        return p.read_text(errors="ignore")
    except OSError:
        return None


def load_json(p):
    t = read(p)
    if t is None:
        return None
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        return None


# ---------- content rules ----------
def scan_secrets(a, path, text):
    real = pathlib.Path(path).resolve()
    rel = str(real.relative_to(G)) if str(real).startswith(str(G) + "/") else None
    for i, line in enumerate(text.splitlines(), 1):
        for name, rx in SECRETS.items():
            if rx.search(line):
                # same fingerprint as .githooks/pre-commit: sha256 of the line *with* its newline (sed -n Np | sha256sum)
                if rel and f"{rel} {hashlib.sha256((line + chr(10)).encode()).hexdigest()[:16]}" in a.allow_fp:
                    continue
                if name in PLACEHOLDER_RULES and PLACEHOLDER.search(line):
                    continue
                a.add(f"secret:{name}", "critical", path, i, "key-shaped value (masked)")


def scan_prose(a, path, text, injection=True):
    fence = False
    for i, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith(("```", "~~~")):
            fence = not fence
        if HIDDEN.search(line):
            a.add("hidden-unicode", "high", path, i, "zero-width / bidi control character")
        m = INJECTION.search(line) if injection and not fence else None
        if m and not quoted(line, m.start()) and not NEGATED.search(line[:m.start()]):
            a.add("injection-phrase", "high", path, i, "auto-run / override phrasing")
        if B64.search(line):
            a.add("base64-blob", "medium", path, i, "long base64-like blob")
    for m in HTML_CMT.finditer(text):
        if CMT_BAD.search(m.group(1)):
            a.add("html-comment-instruction", "high", path, text[:m.start()].count("\n") + 1, "instruction hidden in HTML comment")


def scan_agent(a, path, text):
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    fm = m.group(1) if m else ""
    tools = re.search(r"^tools:\s*(.*)$", fm, re.M)
    if not tools:
        a.add("agent-inherits-all-tools", "info", path, 1, "no tools: line, agent gets every tool")
    elif re.search(r"\bBash\b", tools.group(1)) and re.search(r"(?i)^(name|description):.*\b(review|audit|verif)", fm, re.M):
        a.add("review-agent-has-bash", "info", path, 1, "read-only role with Bash (make sure the prompt forbids edits)")


def is_library(p):
    return str(pathlib.Path(p).resolve()).startswith(str(G / "library") + "/")


def scan_md_tree(a, root, kind, seen):
    root = pathlib.Path(root)
    if not root.exists():
        return
    files = [root] if root.is_file() else [p for p in root.rglob("*") if p.is_file()]
    for p in files:
        rp = p.resolve()
        if rp in seen:
            continue
        seen.add(rp)
        t = read(p)
        if t is None:
            continue
        scan_secrets(a, p, t)
        if p.suffix == ".md":
            scan_prose(a, p, t)  # library text is third-party: the likeliest place for planted instructions
            if kind == "agent":
                scan_agent(a, p, t)


def walk_links(root):
    """rglob doesn't follow symlinked dirs; ~/.claude/skills is all symlinks."""
    out = []
    root = pathlib.Path(root)
    if not root.exists():
        return out
    for dirpath, dirs, files in os.walk(root, followlinks=True):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "__pycache__")]
        out += [pathlib.Path(dirpath) / f for f in files]
    return out


# ---------- settings / hooks / mcp ----------
def strings(obj, skip_keys=()):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in skip_keys:
                continue
            yield from strings(v, skip_keys)
    elif isinstance(obj, list):
        for v in obj:
            yield from strings(v, skip_keys)
    elif isinstance(obj, str):
        yield obj


def kv_strings(obj, where=""):
    """(top-level field, key, string) for every string value, keys kept for key=value matching."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            w = where or k
            if isinstance(v, str):
                yield w, (k if where else ""), v
            else:
                yield from kv_strings(v, w)
    elif isinstance(obj, list):
        for v in obj:
            if isinstance(v, str):
                yield where, "", v
            else:
                yield from kv_strings(v, where)


def scan_settings(a, path, scope):
    s = load_json(path)
    if not isinstance(s, dict):
        return
    t = read(path) or ""
    scan_secrets(a, path, t)
    perms = s.get("permissions", {}) or {}
    for entry in perms.get("allow", []) or []:
        if entry in ("Bash", "Bash(*)", "Bash(*:*)", "Bash(**)"):
            a.add("allow-bare-bash", "critical", path, None, f"permissions.allow has {entry!r}: any shell command runs unasked")
    if perms.get("defaultMode") == "bypassPermissions" or s.get("defaultMode") == "bypassPermissions":
        a.add("bypass-permissions-mode", "critical", path, None, "defaultMode bypassPermissions")
    if s.get("enableAllProjectMcpServers") is True:
        a.add("enable-all-project-mcp", "high", path, None, "every project .mcp.json server is auto-trusted")
    for v in strings({k: v for k, v in s.items() if k != "permissions"}):
        if "dangerously-skip-permissions" in v:
            a.add("skip-permissions-flag", "high", path, None, "dangerously-skip-permissions in a command")
    for k in (s.get("env") or {}):
        if k.endswith("_BASE_URL"):
            a.add("base-url-override", "high" if scope == "project" else "medium", path, None,
                  f"env {k} redirects API traffic (CVE-2026-21852 pattern)")
    for event, groups in (s.get("hooks") or {}).items():
        for g in groups or []:
            for h in g.get("hooks", []) or []:
                c = h.get("command", "") or ""
                if EXFIL.search(c):
                    a.add("hook-network-or-encode", "high", path, None, f"{event} hook runs {EXFIL.search(c).group(1)}")
                if PIPE_SH.search(c):
                    a.add("hook-pipe-to-shell", "high", path, None, f"{event} hook pipes into a shell")
                if re.search(r"tool_input|CLAUDE_TOOL|\$ARGUMENTS", c) and re.search(r"\$\(|`|\$\{", c):
                    a.add("hook-command-injection", "critical", path, None, f"{event} hook interpolates tool input into the shell")
                if re.search(r"\|\|\s*true|2>\s*/dev/null", c):
                    a.add("hook-silent-failure", "medium", path, None, f"{event} hook hides its own failures")
    return s


def deny_check(a, settings_paths):
    deny = []
    for p in settings_paths:
        s = load_json(p) or {}
        deny += (s.get("permissions") or {}).get("deny", []) or []
    joined = " ".join(deny)
    missing = [n for n, pat in ((".env files", r"\.env"), ("~/.ssh", r"\.ssh"), ("~/.aws", r"\.aws")) if not re.search(pat, joined)]
    if missing:
        a.add("deny-missing-sensitive-reads", "high", settings_paths[0], None,
              f"no deny rule for reading {', '.join(missing)} (e.g. \"Read(**/.env*)\", \"Read(~/.ssh/**)\", \"Read(~/.aws/**)\")")


PINNED = re.compile(r"(@\d[\w.\-]*$|==\d)")


def scan_mcp(a, path, servers):
    for name, cfg in (servers or {}).items():
        if not isinstance(cfg, dict):
            continue
        cmd = cfg.get("command", "") or ""
        args = [str(x) for x in cfg.get("args", []) or []]
        typ = cfg.get("type", "stdio")
        if typ in ("http", "sse") or cfg.get("url"):
            a.add("mcp-remote", "info", path, None, f"server {name!r} is remote ({typ})")
        base = pathlib.Path(cmd).name
        if base in ("npx", "bunx", "pnpx") or base == "uvx":
            pkgs = [x for x in args if not x.startswith("-")]
            pkg = pkgs[0] if pkgs else ""
            if pkg and not PINNED.search(pkg):
                a.add("mcp-unpinned", "medium", path, None, f"server {name!r}: {base} {pkg} has no pinned version")
        blob = " ".join([name, cmd] + args).lower()
        if re.search(r"\b(shell|exec|terminal|commander)\b", blob):
            a.add("mcp-shell-server", "high", path, None, f"server {name!r} exposes shell execution")
        if "filesystem" in blob and any(x in ("/", "~", str(HOME), "$HOME") for x in args):
            a.add("mcp-fs-root", "high", path, None, f"server {name!r} gets the whole filesystem/home")
        # every string anywhere in the server config: args, url, headers, env (key=value so assigned-secret fires)
        for where, k, v in kv_strings(cfg):
            if v.startswith("${") or v.startswith("$"):
                continue
            hit = next((n for n, rx in SECRETS.items() if rx.search(f"{k}={v}" if k else v)), None)
            if hit:
                a.add("mcp-inline-secret", "critical", path, None,
                      f"server {name!r} {where}{('.' + k) if k else ''} holds an inline secret ({hit}, masked)")


# ---------- scopes ----------
def scan_global(a):
    seen = set()
    sp = [CL / "settings.json", CL / "settings.local.json"]
    for p in sp:
        scan_settings(a, p, "global")
    deny_check(a, [p for p in sp if p.exists()] or [CL / "settings.json"])
    # CLAUDE.md and its @imports
    todo, done = [CL / "CLAUDE.md"], set()
    while todo:
        p = todo.pop()
        if not p.exists() or p.resolve() in done:
            continue
        done.add(p.resolve())
        scan_md_tree(a, p, "md", seen)
        for m in re.finditer(r"^@(\S+)", read(p) or "", re.M):
            q = pathlib.Path(os.path.expanduser(m.group(1)))
            todo.append(q if q.is_absolute() else p.parent / q)
    for p in walk_links(CL / "agents"):
        scan_md_tree(a, p, "agent", seen)
    for p in walk_links(CL / "skills"):
        scan_md_tree(a, p, "skill", seen)
    # gigaforge's own sources too, installed or not (seen dedupes by realpath)
    for p in walk_links(G / "global/agents"):
        scan_md_tree(a, p, "agent", seen)
    for sub in ("global/skills", "library/skills", "library/checklists"):
        for p in walk_links(G / sub):
            scan_md_tree(a, p, "skill", seen)
    for ioc in ("router_runtime.js", "setup.mjs"):
        if (CL / ioc).exists():
            a.add("persistence-ioc", "critical", CL / ioc, None, "known malicious persistence file name")
    cj = load_json(HOME / ".claude.json") or {}
    scan_mcp(a, HOME / ".claude.json", cj.get("mcpServers"))
    for proj, v in (cj.get("projects") or {}).items():
        if isinstance(v, dict) and v.get("mcpServers"):
            scan_mcp(a, HOME / ".claude.json", v["mcpServers"])
    # installed plugins: their MCP servers and hooks run with your permissions too
    ip = load_json(CL / "plugins/installed_plugins.json") or {}
    enabled = (load_json(CL / "settings.json") or {}).get("enabledPlugins", {})
    for pid, entries in (ip.get("plugins") or {}).items():
        if enabled and not enabled.get(pid):
            continue
        for e in entries:
            root = pathlib.Path(e.get("installPath", ""))
            mj = load_json(root / ".mcp.json") or {}
            scan_mcp(a, root / ".mcp.json", mj.get("mcpServers", mj if all(isinstance(x, dict) for x in mj.values()) else {}))
            hj = load_json(root / "hooks/hooks.json")
            if hj:
                scan_settings(a, root / "hooks/hooks.json", "plugin")


def scan_project(a, repo):
    repo = pathlib.Path(repo).resolve()
    seen = set()
    for f in ("CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md"):
        scan_md_tree(a, repo / f, "md", seen)
    for f in (".claude/settings.json", ".claude/settings.local.json"):
        scan_settings(a, repo / f, "project")
    for p in walk_links(repo / ".claude"):
        if p.name in ("settings.json", "settings.local.json"):
            continue
        kind = "agent" if "agents" in p.parts else "skill"
        scan_md_tree(a, p, kind, seen)
    mj = load_json(repo / ".mcp.json")
    if mj:
        scan_secrets(a, repo / ".mcp.json", read(repo / ".mcp.json") or "")
        scan_mcp(a, repo / ".mcp.json", mj.get("mcpServers"))
    for ioc in (".claude/router_runtime.js", ".claude/setup.mjs"):
        if (repo / ioc).exists():
            a.add("persistence-ioc", "critical", repo / ioc, None, "known malicious persistence file name")
    t = read(repo / ".vscode/tasks.json")
    if t and "folderOpen" in t:
        a.add("persistence-ioc", "critical", repo / ".vscode/tasks.json", None, "task runs automatically on folder open")
    for wf in sorted((repo / ".github/workflows").glob("*.y*ml")) if (repo / ".github/workflows").is_dir() else []:
        t = read(wf) or ""
        if re.search(r"\b(pull_request_target|workflow_run)\b", t) and re.search(
                r"github\.event\.pull_request\.head\.(sha|ref)|github\.head_ref|workflow_run\.head_(sha|branch)", t):
            a.add("gha-pwn-request", "high", wf, None, "privileged trigger checks out untrusted PR code")
        for i, line in enumerate(t.splitlines(), 1):
            if re.search(r"\b(npm ci|npm install|pnpm install|yarn install)\b", line) and "--ignore-scripts" not in line:
                a.add("gha-install-scripts", "medium", wf, i, "dependency install runs lifecycle scripts")
        scan_secrets(a, wf, t)


def main(argv):
    as_json = "--json" in argv
    argv = [x for x in argv if x != "--json"]
    a = Audit()
    scan_global(a)
    targets = []
    if argv[:1] == ["--all"]:
        regf = pathlib.Path(os.environ.get("GIGAFORGE_KIT_REGISTRY", G / "kit/projects.json"))  # same knob as bin/kit
        reg = json.loads(regf.read_text()) if regf.exists() else {"projects": {}}
        targets = sorted(reg["projects"])
        if not targets:
            print("note: kit/projects.json has no projects yet (kit apply <repo>)", file=sys.stderr)
    elif argv:
        targets = [argv[0]]
    for t in targets:
        if pathlib.Path(t).is_dir():
            scan_project(a, t)
        else:
            a.add("project-missing", "info", pathlib.Path(t), None, "registered path no longer exists")
    fs = sorted(a.findings, key=lambda f: (SEV_ORDER[f["severity"]], f["path"], f["line"] or 0))
    blocking = [f for f in fs if f["severity"] in ("critical", "high") and not f["accepted"]]
    if as_json:
        print(json.dumps({"findings": fs, "blocking": len(blocking)}, indent=2))
    else:
        scopes = "global" + (f" + {len(targets)} project(s)" if targets else "")
        print(f"kit audit ({scopes})")
        for f in fs:
            loc = f"{f['path']}" + (f":{f['line']}" if f["line"] else "")
            acc = f"  accepted ({f['accepted']})" if f["accepted"] else ""
            print(f"  {f['severity']:<8} {f['rule']:<30} {loc}  {f['msg']}{acc}")
        counts = {s: sum(1 for f in fs if f["severity"] == s) for s in SEV_ORDER}
        print(f"audit: {counts['critical']} critical, {counts['high']} high, {counts['medium']} medium, {counts['info']} info; "
              f"{len(blocking)} blocking (unaccepted critical/high)")
    return 1 if blocking else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
