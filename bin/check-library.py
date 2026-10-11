#!/usr/bin/env python3
"""Validate gigaforge/library against library/sources.json.

    bin/check-library.py           structure, provenance, reproducibility, credits
    bin/check-library.py --drift   also list upstream commits since each pin
                                   (uses the local clone's refs; /absorb fetches)

Exit 1 on any FAIL. Prints file and reason only, never file contents.
"""
import json, os, pathlib, re, subprocess, sys, tempfile

G = pathlib.Path(__file__).resolve().parent.parent
LIB = G / "library"
BUILTIN = {"security-review", "code-review", "review", "init", "simplify", "loop", "schedule", "run",
           "claude-api", "update-config", "keybindings-help", "fewer-permission-prompts", "plugin-authoring"}
SUSPECT = re.compile(r"\becc\b|everything-claude|homunculus|instinct|/ecc:|CLAUDE_PLUGIN_ROOT|Prompt Defense", re.I)
CREDIT = re.compile(r"MIT License|credit:", re.I)
fails = []


def fail(msg):
    fails.append(msg)
    print(f"FAIL {msg}")


def frontmatter(path):
    m = re.match(r"^---\n(.*?)\n---\n", path.read_text(), re.S)
    if not m:
        return None, path.read_text()
    fm, out = m.group(1), {}
    for line in fm.splitlines():
        k = re.match(r"^\s*([a-z_]+):\s*(.*)$", line)
        if k and k.group(2):
            v = k.group(2).strip()
            out[k.group(1)] = json.loads(v) if v.startswith('"') else v
    return out, path.read_text()[m.end():]


def git(src, *args):
    return subprocess.run(["git", "-C", src["local"], *args], capture_output=True, text=True)


def check_source(key, src):
    sha = src["pinned_sha"]
    if git(src, "cat-file", "-e", f"{sha}^{{commit}}").returncode:
        return fail(f"{key}: pinned_sha {sha[:8]} not in {src['local']}")
    ledger = (G / "brain" / "library-ledger.md").read_text()
    # skills: provenance + no upstream leftovers + credits kept
    for name, up in src["skills"].items():
        f = LIB / "skills" / name / "SKILL.md"
        if not f.exists():
            fail(f"skills/{name}: missing (run bin/absorb-adapt.py {key} {name})"); continue
        fm, body = frontmatter(f)
        want = {"name": name, "type": "library", "source": key, "upstream": up,
                "upstream_sha": sha[:8], "absorbed": src["absorbed"]}
        for k, v in want.items():
            if (fm or {}).get(k) != v:
                fail(f"skills/{name}: frontmatter {k}={fm.get(k) if fm else None!r}, want {v!r}")
        d = (fm or {}).get("description", "")
        if not d or len(d) > 1024 or d[:1] in ">|":
            fail(f"skills/{name}: description empty or > 1024 chars")
        for i, line in enumerate(body.splitlines(), 1):
            if SUSPECT.search(line):
                fail(f"skills/{name}: upstream-specific text at body line {i}")
        upstream = git(src, "show", f"{sha}:{up}/SKILL.md").stdout
        for line in upstream.splitlines():
            if CREDIT.search(line) and line.strip() not in body:
                fail(f"skills/{name}: upstream credit line dropped: {line.strip()[:70]!r}")
        if f"skill `{name}`" not in ledger:
            fail(f"skills/{name}: no row in brain/library-ledger.md")
    # checklists
    for name in src["checklists"]:
        f = LIB / "checklists" / f"{name}.md"
        if not f.exists():
            fail(f"checklists/{name}.md: missing"); continue
        fm, body = frontmatter(f)
        if not fm or fm.get("name") != f"checklist-{name}" or fm.get("type") != "library" or fm.get("source") != key:
            fail(f"checklists/{name}.md: frontmatter needs name=checklist-{name}, type=library, source={key}")
        if SUSPECT.search(body):
            fail(f"checklists/{name}.md: upstream-specific text in body")
        if f"checklist `{name}`" not in ledger:
            fail(f"checklists/{name}.md: no row in brain/library-ledger.md")
    # reproducibility: a fresh adapter run must match byte for byte (no hand edits)
    with tempfile.TemporaryDirectory() as tmp:
        r = subprocess.run([sys.executable, str(G / "bin/absorb-adapt.py"), key], capture_output=True,
                           text=True, env={**os.environ, "ABSORB_OUT": tmp})
        if r.returncode:
            fail(f"{key}: absorb-adapt.py exited {r.returncode}: {r.stdout.strip().splitlines()[-1:]}")
        d = subprocess.run(["diff", "-rq", tmp, str(LIB / "skills")], capture_output=True, text=True)
        for line in d.stdout.splitlines():
            if "Only in " + str(LIB / "skills") in line and not any(n in line for n in src["skills"]):
                continue  # another source's skill
            fail(f"{key}: not reproducible ({line.replace(tmp, '<fresh>')}); move the hand edit into sources.json edits")


def check_names(sources):
    mine = {n for s in sources.values() for n in s["skills"]}
    for d in (LIB / "skills").iterdir():
        if d.name not in mine:
            fail(f"skills/{d.name}: not in sources.json")
    for n in sorted(mine & ({p.name for p in (G / "global/skills").iterdir()} | BUILTIN)):
        fail(f"skills/{n}: name collides with a gigaforge or built-in skill")
    home = pathlib.Path.home() / ".claude/skills"
    for n in sorted(mine):
        p = home / n
        if p.exists() and not (p.is_symlink() and str(p.resolve()).startswith(str(LIB))):
            fail(f"skills/{n}: ~/.claude/skills/{n} exists and is not this library's symlink")


def drift(key, src):
    paths = list(src["skills"].values()) + [p for ps in src["checklists"].values() for p in ps]
    ref = f"origin/{src.get('branch', 'main')}"
    if git(src, "rev-parse", "--verify", "-q", ref).returncode:
        return fail(f"{key}: drift: {ref} missing in {src['local']} (git fetch first, or fix 'branch')")
    if git(src, "merge-base", "--is-ancestor", src["pinned_sha"], ref).returncode:
        return fail(f"{key}: drift: pin {src['pinned_sha'][:8]} is not an ancestor of {ref} (upstream rewrote history?)")
    r = git(src, "log", "--oneline", f"{src['pinned_sha']}..{ref}", "--", *paths)
    c = git(src, "rev-list", "--count", f"{src['pinned_sha']}..{ref}")
    if r.returncode or c.returncode:
        return fail(f"{key}: drift: git log failed: {(r.stderr or c.stderr).strip()[:120]}")
    log, total = r.stdout.splitlines(), c.stdout.strip()
    print(f"drift {key}: {total} upstream commits since pin, {len(log)} touch absorbed paths")
    for line in log[:20]:
        print(f"  {line}")


def main():
    sources = json.loads((LIB / "sources.json").read_text())
    for key, src in sources.items():
        check_source(key, src)
        if "--drift" in sys.argv:
            drift(key, src)
    check_names(sources)
    n_sk = sum(len(s["skills"]) for s in sources.values())
    n_cl = sum(len(s["checklists"]) for s in sources.values())
    print(f"check-library: {n_sk} skills, {n_cl} checklists, {len(fails)} failure(s)")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
