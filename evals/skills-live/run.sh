#!/usr/bin/env bash
# Skill-trigger evals staged closer to a live session (see NOTES.md).
#
#   evals/skills-live/run.sh <arm> [claude plugin eval flags, e.g. --runs 1 --case 'live-retro-*']
#
# Arms (each a throwaway plugin "core" in a temp dir, same cases):
#   s11      global/skills only (what bin/eval-skills stages)
#   s42      global/skills + library/skills (the user skills a live session lists)
#   s42ctx   s42 + the brain's context: a SessionStart hook that prints CORE.md and
#            gigabrain/CLAUDE.md, and a copy of the coach UserPromptSubmit hook
#            (signals off, headless guard bypassed so it actually emits cues)
#   s42ctx-fix  s42ctx with the candidate fix applied to the staged copies only
#            (overlays from $FIX, default fix/: CORE.md, coach.py, skills/<name>/SKILL.md)
# Real model calls, ~$0.10 a run. Results: evals/skills-live/results/<arm>-<ts>/ (gitignored).
set -euo pipefail
G="$(cd "$(dirname "$(readlink -f "$0")")/../.." && pwd)"
L="$G/evals/skills-live"
arm="${1:?arm: s11 | s42 | s42ctx | s42ctx-fix}"; shift
T="$(mktemp -d "${TMPDIR:-/tmp}/gb-eval-live.XXXXXX")"
trap 'rm -rf "$T"' EXIT
P="$T/plugin"
mkdir -p "$P/.claude-plugin" "$P/evals"
printf '{"name": "core", "description": "gigabrain skills, staged for live-shaped evals", "version": "0.0.0"}\n' \
  > "$P/.claude-plugin/plugin.json"
cp -R "$G/global/skills" "$P/skills"
case "$arm" in s42*) cp -R "$G"/library/skills/* "$P/skills/";; esac
for c in "$L"/cases/*/; do cp -R "${c%/}" "$P/evals/"; done

if [[ "$arm" == s42ctx* ]]; then
  # coach.py finds brain/ and me/ at parents[2] of itself: $P/hooks/coach.py -> $T
  mkdir -p "$P/hooks" "$T/brain" "$T/me"
  cp "$G/global/hooks/coach.py" "$P/hooks/coach.py"
  cp "$G/brain/coaching.md" "$T/brain/coaching.md"
  cp "$G/me/roadmap.md" "$T/me/roadmap.md"
  { cat "$G/brain/CORE.md"; echo; cat "$G/CLAUDE.md"; } > "$P/hooks/context.md"
  if [ "$arm" = s42ctx-fix ]; then
    F="${FIX:-$L/fix}"
    [ -f "$F/CORE.md" ] && { cat "$F/CORE.md"; echo; cat "$G/CLAUDE.md"; } > "$P/hooks/context.md"
    [ -f "$F/coach.py" ] && cp "$F/coach.py" "$P/hooks/coach.py"
    for d in "$F"/skills/*/; do [ -d "$d" ] && cp "$d/SKILL.md" "$P/skills/$(basename "$d")/SKILL.md"; done
    arm="$arm-$(basename "$F")"
  fi
  cat > "$P/hooks/coach.sh" <<'SH'
#!/usr/bin/env bash
# The real hook stays silent in headless runs; drop that guard and keep signals off.
exec env -u CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_SESSION_ATTENDED=1 GIGABRAIN_NO_SIGNALS=1 \
  python3 "${CLAUDE_PLUGIN_ROOT}/hooks/coach.py"
SH
  chmod +x "$P/hooks/coach.sh"
  cat > "$P/hooks/hooks.json" <<'J'
{"hooks": {
  "SessionStart": [{"hooks": [{"type": "command", "command": "cat \"${CLAUDE_PLUGIN_ROOT}/hooks/context.md\""}]}],
  "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/coach.sh"}]}]
}}
J
fi
echo "staged $arm: $(ls "$P/skills" | wc -l | tr -d ' ') skills"
out="$L/results/$arm-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$out"
set +e
claude plugin eval "$P" --trust-plugin --ablation none --no-publish --runs 2 --concurrency 4 \
  --max-cost-usd 3 --threshold 1 --output-dir "$out" --report "$out/report.html" "$@"
rc=$?
set -e
python3 - "$out" <<'PY'
import json, sys, pathlib
f = pathlib.Path(sys.argv[1]) / "aggregate-result.json"
if f.exists():
    d = json.loads(f.read_text())
    print(f"cost ${d.get('costUsd', 0):.2f}")
    for c in d.get("cases", []):
        runs = c["arms"].get("with", [])
        print(f"  {c['name']:22} {sum(r['passed'] for r in runs)}/{len(runs)}")
PY
echo "results: $out (exit $rc)"
exit $rc
