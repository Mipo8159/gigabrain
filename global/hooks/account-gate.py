#!/usr/bin/env python3
"""Account gate: which Claude account is working in a work repo (UserPromptSubmit).

Why (Giga, 2026-10-29): the work account hits its limits, so a personal account must be able to
work in work repos without being blocked. Code may go through it (Giga's call, knowing it leaves
the employer's agreement); live data (databases, cloud data, server logs/shells) may not.

  work repo   cwd under a `work_roots` entry of kit/accounts.local.json, or a
              "kind": "client" path in kit/projects.local.json (both gitignored)
  work org    organizationUuid of the logged-in account (~/.claude.json) listed in
              `work_orgs`. Record it once, logged in with the work account:
              python3 ~/projects/gigabrain/global/hooks/account-gate.py --mark-work
Reads $CLAUDE_CONFIG_DIR/.claude.json when set.

mode(cwd): "off" (not a work repo), "work" (verified work account) or "personal" (a work repo on
any other account; ANTHROPIC_API_KEY / CLAUDE_CODE_OAUTH_TOKEN count as personal, the account
file can't vouch for them). Never blocks a prompt: in personal mode it shows a notice once per
session, and guard.py's live-data check denies the data commands. A registry it can't read
counts as personal under ~/projects (fails closed), off elsewhere.
Personal repos (gigabrain, labs) are "off". Never prints emails or ids.
"""
import json, os, pathlib, re, sys, time

G = pathlib.Path(__file__).resolve().parents[2]
ACCOUNTS = G / "kit" / "accounts.local.json"
PROJECTS = G / "kit" / "projects.local.json"
TOKEN_ENV = ("ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN")  # auth that bypasses oauthAccount
STATE_DIR = pathlib.Path(os.environ.get("XDG_RUNTIME_DIR") or "/tmp") / f"gigabrain-gate-{os.getuid()}"
BLOCKED = "databases, AWS data reads (logs, s3 cp, dynamodb, ssm/secrets), kubectl logs/exec/cp, ssh/scp"


class Corrupt(Exception):
    pass


def load(f):
    """{} if missing; Corrupt if present but not a JSON object (a broken registry must not open the gate)."""
    if not f.exists():
        return {}
    try:
        d = json.loads(f.read_text())
    except (OSError, json.JSONDecodeError, UnicodeDecodeError) as e:
        raise Corrupt(f"{f.name} is unreadable") from e
    if not isinstance(d, dict):
        raise Corrupt(f"{f.name} is not a JSON object")
    return d


def config_file():
    d = os.environ.get("CLAUDE_CONFIG_DIR")
    return pathlib.Path(d).expanduser() / ".claude.json" if d else pathlib.Path.home() / ".claude.json"


def current_org():
    try:
        acct = load(config_file()).get("oauthAccount") or {}
    except Corrupt:
        return ""
    return acct.get("organizationUuid") or "" if isinstance(acct, dict) else ""


def norm(x):
    return pathlib.Path(os.path.expanduser(str(x))).resolve()


def is_work(cwd, cfg):
    p = norm(cwd)
    roots = [norm(r) for r in cfg.get("work_roots") or [] if isinstance(r, str)]
    roots += [norm(k) for k, v in (load(PROJECTS).get("projects") or {}).items()
              if isinstance(v, dict) and v.get("kind") == "client"]
    return any(p == r or r in p.parents for r in roots)


def mark_work():
    org = current_org()
    if not org:
        print("no logged-in account found in the Claude config; run /login first")
        return 1
    try:
        cfg = load(ACCOUNTS)
    except Corrupt as e:
        print(f"{e}: fix or delete it first (not overwriting it)")
        return 1
    orgs = cfg.setdefault("work_orgs", [])
    if org not in orgs:
        orgs.append(org)
    cfg.setdefault("work_roots", [])
    ACCOUNTS.write_text(json.dumps(cfg, indent=2) + "\n")
    print(f"marked the current account's organization as work ({len(orgs)} work org(s)) in {ACCOUNTS}")
    return 0


def maybe_work(cwd):
    """Fallback when the registry can't be trusted: anything under ~/projects except gigabrain itself."""
    try:
        c = norm(cwd)
    except (OSError, RuntimeError, ValueError):
        return True
    return "/projects/" in str(c) and c != G and G not in c.parents


def mode(cwd):
    """'off', 'work' or 'personal' (see the module docstring)."""
    try:
        cfg = load(ACCOUNTS)
        work = is_work(cwd, cfg)
    except Corrupt:  # can't tell what is work: treat it as personal only where it might be
        return "personal" if maybe_work(cwd) else "off"
    if not work:
        return "off"
    if any(os.environ.get(k) for k in TOKEN_ENV):
        return "personal"
    org = current_org()
    return "work" if org and org in (cfg.get("work_orgs") or []) else "personal"


def first_time(session):
    """True once per session (always, when there is no session id)."""
    if not session or not re.fullmatch(r"[\w-]{1,128}", session):
        return True
    try:
        STATE_DIR.mkdir(mode=0o700, exist_ok=True)
        for f in STATE_DIR.iterdir():  # sweep: one empty file per session, kept 3 days
            if f.stat().st_mtime < time.time() - 3 * 86400:
                f.unlink(missing_ok=True)
        (STATE_DIR / session).touch(exist_ok=False)
        return True
    except FileExistsError:
        return False
    except OSError:
        return True


def notice(inp):
    """Personal mode: the model is told on every prompt (it survives /compact); Giga sees it once per session."""
    cwd = inp.get("cwd") or os.getcwd()
    if mode(cwd) != "personal":
        return 0
    hso = {"hookEventName": "UserPromptSubmit", "additionalContext":
           "gigabrain personal mode: this work repo runs on a non-work Claude account. Do not pull live data "
           f"({BLOCKED}) into the session, and never route around the guard's live-data denial (no wrapper "
           "scripts, npm scripts or curl to the same data). Ask Giga to run it on the work account instead."}
    if not first_time(inp.get("session_id")):
        sys.stdout.write(json.dumps({"hookSpecificOutput": hso}))
        return 0
    try:
        unmarked = not load(ACCOUNTS).get("work_orgs")
    except Corrupt:
        unmarked = False
    hint = (" On the work account? Run once: ! python3 ~/projects/gigabrain/global/hooks/account-gate.py --mark-work"
            if unmarked else "")
    sys.stdout.write(json.dumps({
        "systemMessage": f"gigabrain: personal mode in a work repo. Code is fine; live data is blocked ({BLOCKED}). "
                         f"Switch to the work account for those.{hint}", "hookSpecificOutput": hso}))
    return 0


def main():
    if sys.argv[1:] == ["--mark-work"]:
        return mark_work()
    try:
        inp = json.loads(sys.stdin.read(2_000_000) or "{}")
        return notice(inp if isinstance(inp, dict) else {})
    except Exception:  # the notice is advisory; guard.py's live-data check enforces (and fails closed)
        return 0


if __name__ == "__main__":
    sys.exit(main())
