#!/usr/bin/env python3
"""Adapt upstream skills into gigaforge/library/skills, deterministically.

    bin/absorb-adapt.py <source> [--sha SHA] [skill ...]

Reads each skill from the source's git object store at SHA (default: the
source's pinned_sha in library/sources.json), never from its working tree, so
the result is reproducible. Writes library/skills/<local-name>/, replacing what
is there. Re-running at a newer SHA is how /absorb --update refreshes a skill:
every edit lives in sources.json ("edits"), never as a hand change to the copy.
Edit keys per skill: description (replacement string), drop_sections (titles),
replace ([[old, new], ...] on the body), extras (non-markdown files to copy,
after review; markdown references are copied by default), exclude_extras (globs
of upstream files never to copy, markdown included).

Transforms: new frontmatter with provenance; drop sections named in
edits.<skill>.drop_sections; apply edits.<skill>.replace [[old, new], ...]; replace "Related" sections with links to what
gigaforge actually has (keeping licence credits); rename renamed skills in the body. Prints WARN lines
for upstream-specific text it can't fix, for /absorb to handle via an edit rule.
"""
import fnmatch, json, pathlib, re, shutil, subprocess, sys

G = pathlib.Path(__file__).resolve().parent.parent
LIB = G / "library"
OUT = pathlib.Path(__import__("os").environ.get("ABSORB_OUT", LIB / "skills"))  # check-library diffs a fresh run
RELATED = re.compile(r"^(related|related skills|see also)\b", re.I)
CREDIT = re.compile(r"credit|attribution|adapted from|based on|licen[cs]e", re.I)
SUSPECT = re.compile(r"\becc\b|everything-claude|homunculus|instinct|/ecc:|CLAUDE_PLUGIN_ROOT|~/\.codex", re.I)


def git_show(src, sha, path, binary=False):
    out = subprocess.run(["git", "-C", src["local"], "show", f"{sha}:{path}"],
                         capture_output=True, check=True).stdout
    return out if binary else out.decode()


def git_ls(src, sha, path):
    out = subprocess.run(["git", "-C", src["local"], "ls-tree", "-r", "--name-only", sha, path + "/"],
                         capture_output=True, text=True, check=True).stdout
    return [l for l in out.splitlines() if l]


def split_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        sys.exit("upstream file has no frontmatter")
    return m.group(1), text[m.end():]


def field(fm, key):
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.M)
    if not m:
        return None
    v = m.group(1).strip()
    if v[:1] in ">|":
        sys.exit(f"{key}: YAML block scalars are not supported; add a support for them first")
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1]
    return v


def sections(body):
    """Split into [(level, title, lines)], ignoring '#' inside code fences."""
    out, cur, fence = [], [0, None, []], None  # fence = the opening marker, e.g. "```" or "~~~~"
    for line in body.splitlines():
        f = re.match(r"^\s*(`{3,}|~{3,})", line)
        if f and fence is None:
            fence = f.group(1)
        elif f and f.group(1)[0] == fence[0] and len(f.group(1)) >= len(fence) and not line.strip()[len(f.group(1)):]:
            fence = None
        m = None if fence or f else re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            out.append(tuple(cur))
            cur = [len(m.group(1)), m.group(2).strip(), [line]]
        else:
            cur[2].append(line)
    out.append(tuple(cur))
    return out


def drop(secs, titles, name):
    """Drop each named section and its subsections; warn for titles not found."""
    for missing in titles - {t for _, t, _ in secs}:
        print(f"WARN {name}: drop_sections title not found upstream any more: {missing!r}")
    keep, skip_below = [], None
    for lvl, title, lines in secs:
        if skip_below is not None and lvl > skip_below:
            continue
        skip_below = None
        if title in titles:
            skip_below = lvl
            continue
        keep.append((lvl, title, lines))
    return keep


def related(lines, have, renames):
    text = "\n".join(lines)
    names = sorted({renames.get(n, n) for n in re.findall(r"[a-z][a-z0-9]+(?:-[a-z0-9]+)+", text)} & have)
    out = []
    if names:
        out.append("- Skills: " + ", ".join(f"`{n}`" for n in names))
    if re.search(r"[a-z]+-reviewer\b", text):
        out.append("- Review: the `reviewer` agent with its checklists in `library/checklists/`")
    credits = [l for l in lines[1:] if CREDIT.search(l)]  # third-party licence notices must survive
    return out + ([""] + credits if credits else [])


def adapt(name, src_key, src, sha, upstream_dir, have, renames):
    raw = git_show(src, sha, f"{upstream_dir}/SKILL.md")
    fm, body = split_frontmatter(raw)
    edits = src.get("edits", {}).get(name, {})
    desc = edits.get("description") or field(fm, "description") or sys.exit(f"{name}: no description upstream")
    lic = field(fm, "license")
    secs = drop(sections(body), set(edits.get("drop_sections", [])), name)
    parts = []
    for lvl, title, lines in secs:
        if title and RELATED.match(title):
            rel = related(lines, have - {name}, renames)
            if rel:
                parts.append("\n".join([lines[0], ""] + rel))
            continue
        parts.append("\n".join(lines))
    # join sections with exactly one blank line; never touch blank lines inside
    # a section (code examples keep PEP 8's two blank lines, etc.)
    out = "\n\n".join(p.strip("\n") for p in parts if p.strip())
    for old, new in renames.items():  # not in paths or slash commands: /security-review stays
        out = re.sub(rf"(?<![\w/-]){re.escape(old)}(?![\w/-])", new, out)
    for old, new in edits.get("replace", []):
        if old not in out:
            print(f"WARN {name}: replace target not found upstream any more: {old[:60]!r}")
        out = out.replace(old, new)
    out = out.strip() + "\n"
    head = (f"---\nname: {name}\ndescription: {json.dumps(desc, ensure_ascii=False)}\n"
            + (f"license: {lic}\n" if lic else "") + "metadata:\n"
            f"  type: library\n  source: {src_key}\n  upstream: {upstream_dir}\n"
            f"  upstream_sha: {sha[:8]}\n  absorbed: {src['absorbed']}\n---\n\n")
    dest = OUT / name
    # Extras: markdown references only, unless edits.<skill>.extras lists a file
    # explicitly. Upstream scripts/hooks never ride along unreviewed.
    allow = set(edits.get("extras", []))
    files = [p for p in git_ls(src, sha, upstream_dir) if not p.endswith("/SKILL.md")]
    deny = edits.get("exclude_extras", [])  # globs relative to the skill dir, e.g. "assets/fusion/**"
    rel = lambda p: str(pathlib.Path(p).relative_to(upstream_dir))
    files = [p for p in files if not any(fnmatch.fnmatch(rel(p), g) for g in deny)]
    extras = [p for p in files if p.endswith(".md") or rel(p) in allow]
    for p in sorted(set(files) - set(extras)):
        print(f"skip {name}: {p} (not markdown; list it in edits.{name}.extras after review)")
    blobs = {p: git_show(src, sha, p, binary=True) for p in extras}  # fetch all before touching dest
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    (dest / "SKILL.md").write_text(head + out)
    for p, data in blobs.items():
        rel = pathlib.Path(p).relative_to(upstream_dir)
        (dest / rel).parent.mkdir(parents=True, exist_ok=True)
        (dest / rel).write_bytes(data)
    warns = [f"WARN {name}/{f.name}:{i}: {l.strip()[:90]}"
             for f in dest.rglob("*.md") for i, l in enumerate(f.read_text().splitlines(), 1)
             if SUSPECT.search(l) and not l.startswith(("  source:", "  upstream"))]
    print(f"ok   {name} <- {upstream_dir}@{sha[:8]} ({len(out.splitlines())} lines, {len(extras)} extra files)")
    for w in warns:
        print(w)
    return len(warns)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    src_key, args = args[0], args[1:]
    sha = None
    if args[:1] == ["--sha"]:
        sha, args = args[1], args[2:]
    src = json.loads((LIB / "sources.json").read_text())[src_key]
    sha = subprocess.run(["git", "-C", src["local"], "rev-parse", sha or src["pinned_sha"]],
                         capture_output=True, text=True, check=True).stdout.strip()
    skills = src["skills"]
    renames = {pathlib.Path(up).name: local for local, up in skills.items() if pathlib.Path(up).name != local}
    have = set(skills) | {p.name for p in (G / "global" / "skills").iterdir()}
    todo = args or list(skills)
    warns = sum(adapt(n, src_key, src, sha, skills[n], have, renames) for n in todo)
    print(f"{len(todo)} skill(s) adapted at {sha[:8]}, {warns} warning(s)")
    sys.exit(1 if warns else 0)


if __name__ == "__main__":
    main()
