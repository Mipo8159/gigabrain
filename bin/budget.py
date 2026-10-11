#!/usr/bin/env python3
"""Always-loaded context cost of the gigaforge setup, deterministic (no model call).

    bin/budget.py [<repo>] [--json]

Counts what every session pays before Giga types anything: the ~/.claude/CLAUDE.md
import chain (brain/CORE.md), every skill and agent description Claude Code lists,
and brain/coaching.md (injected on every prompt by the coach hook). Tokens are
estimated as words x 1.3 (ECC context-budget heuristic). Exit 1 only on FAIL.

FAIL: CORE.md > 120 lines; one of OUR skills (global/ or library/) with a
description > 1024 chars (the skill-spec limit).
warn: description < 15 words (weak trigger), agent description > 30 words (loads on
every Task call), coaching.md > 40 lines, project CLAUDE.md chain > 150 lines.
"""
import json, os, pathlib, re, sys

G = pathlib.Path(__file__).resolve().parent.parent
HOME = pathlib.Path.home()
CL = HOME / ".claude"


def toks(text):
    return round(len(text.split()) * 1.3)


def show(p):
    s = str(p)
    return "~" + s[len(str(HOME)):] if s.startswith(str(HOME)) else s


def frontmatter(path):
    try:
        t = pathlib.Path(path).read_text(errors="ignore")
    except OSError:
        return {}
    m = re.match(r"^---\n(.*?)\n---", t, re.S)
    if not m:
        return {}
    out, lines, i = {}, m.group(1).splitlines(), 0
    while i < len(lines):
        k = re.match(r"^([A-Za-z_-]+):\s*(.*)$", lines[i])
        if k:
            key, v = k.group(1), k.group(2).strip()
            if v in (">", "|", ">-", "|-", ">+", "|+"):
                block = []
                while i + 1 < len(lines) and (lines[i + 1].startswith((" ", "\t")) or not lines[i + 1].strip()):
                    i += 1
                    block.append(lines[i].strip())
                v = " ".join(x for x in block if x)
            elif len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            out[key] = v
        i += 1
    return out


def claude_md_chain(start):
    todo, done, files = [pathlib.Path(start)], set(), []
    while todo:
        p = todo.pop(0)
        if not p.exists() or p.resolve() in done:
            continue
        done.add(p.resolve())
        t = p.read_text(errors="ignore")
        files.append((p, len(t.splitlines()), toks(t)))
        for m in re.finditer(r"^@(\S+)", t, re.M):
            q = pathlib.Path(os.path.expanduser(m.group(1)))
            todo.append(q if q.is_absolute() else p.parent / q)
    return files


def skill_dirs():
    """(origin, SKILL.md path); deduped by realpath; plugin skills best effort."""
    out, seen = [], set()

    def add(origin, p):
        rp = p.resolve()
        if rp in seen or not p.exists():
            return
        seen.add(rp)
        out.append((origin, p))

    ours = lambda p: "global" if str(p.resolve()).startswith(str(G / "global")) else \
        "library" if str(p.resolve()).startswith(str(G / "library")) else "local"
    for d in sorted((CL / "skills").glob("*")) if (CL / "skills").exists() else []:
        add(ours(d / "SKILL.md"), d / "SKILL.md")
    for base in ("global/skills", "library/skills"):
        for d in sorted((G / base).glob("*")):
            add(ours(d / "SKILL.md"), d / "SKILL.md")
    ip = CL / "plugins/installed_plugins.json"
    enabled = {}
    try:
        enabled = json.loads((CL / "settings.json").read_text()).get("enabledPlugins", {})
        plugins = json.loads(ip.read_text()).get("plugins", {})
    except (OSError, json.JSONDecodeError):
        plugins = {}
    for pid, entries in plugins.items():
        if enabled and not enabled.get(pid):
            continue
        for e in entries:
            root = pathlib.Path(e.get("installPath", ""))
            for s in sorted(root.glob("skills/*/SKILL.md")):
                add(f"plugin:{pid.split('@')[0]}", s)
    return out


def agent_files():
    out, seen = [], set()
    for p in sorted((CL / "agents").glob("*.md")) if (CL / "agents").exists() else []:
        if p.resolve() not in seen:
            seen.add(p.resolve())
            out.append(p)
    return out


def main(argv):
    as_json = "--json" in argv
    argv = [a for a in argv if a != "--json"]
    rows, fails, warns = [], [], []

    def row(kind, name, lines, tok, status="ok", note=""):
        rows.append({"kind": kind, "name": name, "lines": lines, "tokens": tok, "status": status, "note": note})
        (fails if status == "FAIL" else warns if status == "warn" else []).append(f"{kind} {name}: {note}")

    # 1. CLAUDE.md chain (every session)
    for p, n, tk in claude_md_chain(CL / "CLAUDE.md"):
        st, note = "ok", ""
        if p.resolve() == (G / "brain/CORE.md").resolve() and n > 120:
            st, note = "FAIL", f"CORE.md is {n} lines (budget 120)"
        row("claude-md", show(p), n, tk, st, note)
    # 2. coaching.md (every prompt, via coach hook)
    c = G / "brain/coaching.md"
    if c.exists():
        t = c.read_text()
        n = len(t.splitlines())
        row("per-prompt", "brain/coaching.md", n, toks(t), "warn" if n > 40 else "ok",
            f"{n} lines injected on every prompt (warn > 40)" if n > 40 else "")
    # 3. skill descriptions (listed every session)
    for origin, p in skill_dirs():
        fm = frontmatter(p)
        name, desc = fm.get("name", p.parent.name), fm.get("description", "")
        words = len(desc.split())
        st, note = "ok", ""
        if len(desc) > 1024:
            st, note = ("FAIL" if origin in ("global", "library") else "warn"), f"description {len(desc)} chars (> 1024)"
        elif words < 15:
            st, note = "warn", f"description only {words} words: weak trigger"
        row(f"skill:{origin}", name, None, toks(name + " " + desc), st, note)
    # 4. agent descriptions (every Task call)
    for p in agent_files():
        fm = frontmatter(p)
        desc = fm.get("description", "")
        words = len(desc.split())
        row("agent", fm.get("name", p.stem), None, toks(desc), "warn" if words > 30 else "ok",
            f"description {words} words (> 30, loads on every Task call)" if words > 30 else "")
    # 5. optional project chain
    if argv:
        repo = pathlib.Path(argv[0]).resolve()
        total = 0
        for f in ("CLAUDE.md", ".claude/CLAUDE.md"):
            p = repo / f
            if p.exists():
                t = p.read_text(errors="ignore")
                n = len(t.splitlines())
                total += n
                row("project-md", show(p), n, toks(t))
        if total > 150:
            row("project-md", show(repo), total, 0, "warn", f"project CLAUDE.md chain {total} lines (warn > 150)")

    by = {}
    for r in rows:
        k = r["kind"].split(":")[0] if r["kind"].startswith("skill") else r["kind"]
        by[k] = by.get(k, 0) + r["tokens"]
    total = sum(r["tokens"] for r in rows)
    if as_json:
        print(json.dumps({"rows": rows, "by_kind": by, "total_tokens": total, "fails": fails, "warns": warns}, indent=2))
        return 1 if fails else 0
    print(f"{'kind':<16} {'name':<44} {'lines':>5} {'~tok':>6}  status")
    for r in rows:
        if r["kind"].startswith(("skill", "agent")) and r["status"] == "ok":
            continue  # summarised below; only problems listed individually
        print(f"{r['kind']:<16} {r['name'][:44]:<44} {r['lines'] if r['lines'] is not None else '':>5} {r['tokens']:>6}  "
              f"{r['status']}{'  ' + r['note'] if r['note'] else ''}")
    sk = [r for r in rows if r["kind"].startswith("skill")]
    origins = {}
    for r in sk:
        origins.setdefault(r["kind"].split(":", 1)[1], []).append(r["tokens"])
    for o, ts in sorted(origins.items()):
        print(f"{'skills':<16} {o + f' ({len(ts)})':<44} {'':>5} {sum(ts):>6}  descriptions")
    ag = [r for r in rows if r["kind"] == "agent"]
    print(f"{'agents':<16} {f'{len(ag)} agent descriptions':<44} {'':>5} {sum(r['tokens'] for r in ag):>6}  (per Task call)")
    print(f"total ≈ {total} tokens always-on ({', '.join(f'{k} {v}' for k, v in by.items())}); "
          f"{len(fails)} FAIL, {len(warns)} warn")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
