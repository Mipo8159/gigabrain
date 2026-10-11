#!/usr/bin/env bash
# Wire gigaforge into ~/.claude. Idempotent: safe to re-run after every pull,
# and on a new machine after cloning to /home/mip/Desktop/workdir/sweeft/gigaforge.
# Giga runs this; Claude doesn't (changes to Claude's own config need a human).
#
#   1. ~/.claude/CLAUDE.md          -> global/CLAUDE.md (imports brain/CORE.md)
#   2. ~/.claude/skills/<s>         -> global/skills/<s> and library/skills/<s>
#                                      (dangling links to retired library skills removed)
#   3. ~/.claude/agents/<a>.md      -> global/agents/<a>.md
#   4. ~/.claude/settings.json      += cleanupPeriodDays 365, SessionStart inbox
#                                      notice, ask-before git commit/push, guard hooks
#                                      (PreToolUse/PostToolUse/Stop/SessionStart)
#   4b. ~/.local/bin/kit            -> bin/kit (per-project apply/doctor)
#   5. memory: prune the 6 promoted habits from memory/newEra/MEMORY.md, fix links
#   6. newEra repos: autoMemoryDirectory -> gigaforge/memory/newEra
#   7. git: core.hooksPath=.githooks (secret scan on commit), if this is a repo
set -euo pipefail
G="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
C="$HOME/.claude"
NEWERA=/home/mip/Desktop/workdir/sweeft/newEra
link() { # link <target> <linkpath>: back up a real file/dir once, then symlink
  if [ -e "$2" ] && [ ! -L "$2" ]; then mv "$2" "$2.pre-gigaforge"; echo "  backed up $2"; fi
  ln -sfn "$1" "$2"; echo "  $2 -> $1"
}

echo "1-3. CLAUDE.md, skills, agents"
mkdir -p "$C/skills" "$C/agents"
link "$G/global/CLAUDE.md" "$C/CLAUDE.md"
for s in "$G"/global/skills/*/; do link "${s%/}" "$C/skills/$(basename "$s")"; done
for s in "$G"/library/skills/*/; do  # never shadow one of our own skills
  [ -d "$s" ] || continue; n=$(basename "$s")
  if [ -e "$G/global/skills/$n" ]; then echo "  SKIP library/$n: name taken by global/skills/$n"; continue; fi
  link "${s%/}" "$C/skills/$n"
done
for l in "$C"/skills/*; do  # a library skill retired by /curate leaves a dangling link
  if [ -L "$l" ] && [ ! -e "$l" ] && [[ "$(readlink "$l")" == "$G"/library/* ]]; then rm "$l"; echo "  removed stale $l"; fi
done
for a in "$G"/global/agents/*.md; do link "$a" "$C/agents/$(basename "$a")"; done
chmod +x "$G"/global/hooks/*.sh "$G"/bin/*.sh "$G"/bin/*.py "$G"/.githooks/pre-commit

echo "4. settings.json (backup: $C/backups/settings.json.pre-gigaforge)"
mkdir -p "$C/backups"
[ -f "$C/backups/settings.json.pre-gigaforge" ] || cp "$C/settings.json" "$C/backups/settings.json.pre-gigaforge"
python3 - "$C/settings.json" "$G" <<'EOF'
import json, sys
path, G = sys.argv[1], sys.argv[2]
s = json.load(open(path))
s["cleanupPeriodDays"] = 365  # keep transcripts a year: they are the raw material for re-scoring
ask = s.setdefault("permissions", {}).setdefault("ask", [])
for rule in ["Bash(git commit:*)", "Bash(git push:*)"]:
    if rule not in ask: ask.append(rule)
hooks = s.setdefault("hooks", {})
def ensure(event, cmd, matcher=None, timeout=None):
    groups = hooks.setdefault(event, [])
    for g in groups:
        for h in g.get("hooks", []):
            if h.get("command") == cmd and g.get("matcher") == matcher:
                return
    hook = {"type": "command", "command": cmd}
    if timeout:
        hook["timeout"] = timeout
    groups.append(({"matcher": matcher} if matcher else {}) | {"hooks": [hook]})
ensure("SessionStart", f"{G}/global/hooks/inbox-status.sh")
ensure("UserPromptSubmit", f"python3 {G}/global/hooks/coach.py")
guard = f"python3 {G}/global/hooks/guard.py"  # one dispatcher; profile via .claude/gigaforge.json "hooks"
ensure("PreToolUse", guard, "Bash|Edit|Write|MultiEdit", 10)
ensure("PostToolUse", guard, "Edit|Write|MultiEdit", 10)
ensure("SessionStart", guard, None, 10)
ensure("Stop", guard, None, 150)
json.dump(s, open(path, "w"), indent=2); open(path, "a").write("\n")
print("  cleanupPeriodDays=365, ask: git commit/push, SessionStart: inbox-status+guard, UserPromptSubmit: coach,"
      " PreToolUse/PostToolUse/Stop: guard")
EOF

echo "4b. kit on PATH"
mkdir -p "$HOME/.local/bin"; link "$G/bin/kit" "$HOME/.local/bin/kit"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo "  note: add ~/.local/bin to PATH to type 'kit'";; esac

echo "5. memory/newEra: drop promoted habits from the index, fix renamed link"
python3 - "$G" <<'EOF'
import pathlib, sys
G = pathlib.Path(sys.argv[1]); mem = G / "memory" / "newEra"
moved = ["working-style-interview-then-autonomous-loop.md", "giga-wants-argued-recommendations.md",
         "claude-permissions-are-wide-open.md", "giga-commits-are-mine-to-make.md",
         "dont-strip-architecture-during-cleanup.md", "auxiliary-secrets-land-in-readme.md"]
idx = mem / "MEMORY.md"
lines = [l for l in idx.read_text().splitlines() if not any(m in l for m in moved)]
pointer = "- [gigaforge is the brain](gigaforge-is-the-brain.md) — cross-project habits live in gigaforge/brain (loaded via ~/.claude/CLAUDE.md); this folder holds newEra-only facts."
if pointer not in lines: lines.insert(0, pointer)
idx.write_text("\n".join(lines) + "\n")
for f in list(mem.glob("*.md")) + list((G / "brain").rglob("*.md")):
    t = f.read_text()
    if "auxiliary-secrets-land-in-readme" in t:
        f.write_text(t.replace("auxiliary-secrets-land-in-readme", "secrets-land-in-readme"))
h = G / "brain/habits/claude-permissions-are-wide-open.md"
h.write_text(h.read_text().replace("defaultMode: acceptEdits", "defaultMode: auto"))
print(f"  index now {len(lines)} lines")
EOF

echo "6. newEra repos -> shared memory in gigaforge"
for d in "$NEWERA" "$NEWERA/issue-flow" "$NEWERA/auctionize" "$NEWERA/auxiliary" "$NEWERA/mogulkhan"; do
  [ -d "$d" ] && "$G/bin/link-project.sh" "$d" newEra
done

echo "7. git hooks"
if git -C "$G" rev-parse --git-dir >/dev/null 2>&1; then
  git -C "$G" config core.hooksPath .githooks; echo "  core.hooksPath=.githooks"
else
  echo "  not a git repo yet: re-run after 'git init'"
fi
echo "8. health"
"$G/bin/kit" doctor || echo "  (doctor reported errors above; fix them, then re-run)"
echo "done. Restart Claude sessions so CLAUDE.md, skills, agents and hooks load."
