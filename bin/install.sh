#!/usr/bin/env bash
# Wire gigabrain into ~/.claude. Idempotent: safe to re-run after every pull,
# and on a new machine after cloning to ~/projects/gigabrain.
# Giga runs this; Claude doesn't (changes to Claude's own config need a human).
#
#   1. ~/.claude/CLAUDE.md          -> global/CLAUDE.md (imports brain/CORE.md)
#   2. ~/.claude/skills/<s>         -> global/skills/<s> and library/skills/<s>
#                                      (dangling links to retired library skills removed)
#   2b. plugin marketplace 'gigabrain' -> library/ (opt-in bundles: library/plugins.json;
#                                      enable per repo: claude plugin install <p>@gigabrain --scope local)
#   3. ~/.claude/agents/<a>.md      -> global/agents/<a>.md
#   4. ~/.claude/settings.json      += cleanupPeriodDays 365, SessionStart inbox
#                                      notice, ask-before git commit/push, guard hooks
#                                      (PreToolUse/PostToolUse/Stop/SessionStart),
#                                      session-log (PreCompact/SessionEnd), statusline
#                                      (only if none is set), agent teams env flag
#   4b. ~/.local/bin/kit            -> bin/kit (per-project apply/doctor)
#   6. newEra repos: autoMemoryDirectory -> gigabrain/memory/newEra
#   7. git: core.hooksPath=.githooks (secret scan on commit), if this is a repo
#   7b. ~/.gitconfig include.path    -> global/gitconfig (shared aliases, e.g. git last)
set -euo pipefail
G="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
C="$HOME/.claude"
NEWERA="$HOME/projects/newEra"
link() { # link <target> <linkpath>: back up a real file/dir once, then symlink
  if [ -e "$2" ] && [ ! -L "$2" ]; then mv "$2" "$2.pre-gigabrain"; echo "  backed up $2"; fi
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
if command -v claude >/dev/null; then  # opt-in skill bundles from library/plugins/ (sessions install a cached copy: bump plugin.json version to ship edits)
  mp=$(python3 -c 'import json,sys; print(((json.load(open(sys.argv[1])).get("gigabrain") or {}).get("source") or {}).get("path", ""))' \
       "$C/plugins/known_marketplaces.json" 2>/dev/null || true)
  if [ "$mp" = "$G/library" ]; then echo "  marketplace gigabrain: registered"
  else  # missing, or registered from an old clone path
    [ -n "$mp" ] && claude plugin marketplace remove gigabrain >/dev/null
    claude plugin marketplace add "$G/library" >/dev/null && echo "  marketplace gigabrain -> $G/library"; fi
else echo "  note: claude CLI not on PATH; add the marketplace later: claude plugin marketplace add $G/library"; fi
chmod +x "$G"/global/hooks/*.sh "$G"/global/hooks/*.py "$G"/global/statusline.py "$G"/bin/*.sh "$G"/bin/*.py "$G"/.githooks/pre-commit

echo "4. settings.json (backup: $C/backups/settings.json.pre-gigabrain)"
mkdir -p "$C/backups"
[ -f "$C/backups/settings.json.pre-gigabrain" ] || cp "$C/settings.json" "$C/backups/settings.json.pre-gigabrain"
python3 - "$C/settings.json" "$G" <<'EOF'
import json, sys
path, G = sys.argv[1], sys.argv[2]
s = json.load(open(path))
s["cleanupPeriodDays"] = 365  # keep transcripts a year: they are the raw material for re-scoring
ask = s.setdefault("permissions", {}).setdefault("ask", [])
for rule in ["Bash(git commit:*)", "Bash(git push:*)"]:
    if rule not in ask: ask.append(rule)
# 2026-10-13: the reviewer could not read library/checklists from other repos (blocked outside cwd,
# proven by eval process/review-pass-password-reset). Read-only allow for the library.
allow = s["permissions"].setdefault("allow", [])
lib_read = f"Read(/{G}/library/**)"
if lib_read not in allow: allow.append(lib_read)
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
guard = f"python3 {G}/global/hooks/guard.py"  # one dispatcher; profile via .claude/gigabrain.json "hooks"
ensure("PreToolUse", guard, "Bash|Edit|Write|MultiEdit", 10)
ensure("PostToolUse", guard, "Edit|Write|MultiEdit", 10)
ensure("SessionStart", guard, None, 10)
ensure("Stop", guard, None, 150)
# 2026-10-17: pointer rows for /retro to catch up on sessions that ended without one.
log = f"python3 {G}/global/hooks/session-log.py"
ensure("PreCompact", log)
ensure("SessionEnd", log)
s.setdefault("statusLine", {"type": "command", "command": f"python3 {G}/global/statusline.py", "padding": 0})
# Agent teams (experimental, opted in 2026-10-17). Side effect from the docs: named
# subagents (reviewer, verifier) may launch as teammates; set "0" here to undo.
s.setdefault("env", {}).setdefault("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", "1")
json.dump(s, open(path, "w"), indent=2); open(path, "a").write("\n")
print("  cleanupPeriodDays=365, ask: git commit/push, allow: Read library/**, SessionStart: inbox-status+guard, UserPromptSubmit: coach,"
      " PreToolUse/PostToolUse/Stop: guard, PreCompact/SessionEnd: session-log, statusLine (if unset), env: agent teams")
EOF

echo "4b. kit on PATH"
mkdir -p "$HOME/.local/bin"; link "$G/bin/kit" "$HOME/.local/bin/kit"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo "  note: add ~/.local/bin to PATH to type 'kit'";; esac

echo "6. newEra repos -> shared memory in gigabrain"
for d in "$NEWERA" "$NEWERA/issue-flow" "$NEWERA/auctionize" "$NEWERA/auxiliary" "$NEWERA/mogulkhan"; do
  [ -d "$d" ] && "$G/bin/link-project.sh" "$d" newEra
done

echo "7. git hooks"
if git -C "$G" rev-parse --git-dir >/dev/null 2>&1; then
  git -C "$G" config core.hooksPath .githooks; echo "  core.hooksPath=.githooks"
else
  echo "  not a git repo yet: re-run after 'git init'"
fi
echo "7b. git aliases (global/gitconfig via include.path)"
if git config --global --get-all include.path 2>/dev/null | grep -qxF "$G/global/gitconfig"; then
  echo "  already included"
else
  git config --global --add include.path "$G/global/gitconfig"; echo "  ~/.gitconfig includes $G/global/gitconfig"
fi
echo "8. health"
"$G/bin/kit" doctor || echo "  (doctor reported errors above; fix them, then re-run)"
echo "done. Restart Claude sessions so CLAUDE.md, skills, agents and hooks load."
