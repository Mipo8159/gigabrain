#!/usr/bin/env bash
# Commit + push ONLY the files /retro wrote, never anything else Giga has
# uncommitted. Refuses paths outside brain/ me/ ai-craft/.
#   bin/brain-commit.sh "brain: <what was learned>" brain/habits/x.md me/scorecard.md ...
# Exit codes: 0 committed (push may still have failed: see output), 1 refused/scan failed, 2 nothing to commit.
set -uo pipefail
cd "$(dirname "$(readlink -f "$0")")/.." || exit 1
msg="${1:?usage: brain-commit.sh <message> <file>...}"; shift
[ $# -gt 0 ] || { echo "no files given"; exit 2; }

for f in "$@"; do
  case "$f" in
    brain/*|me/*|ai-craft/*) ;;
    *) echo "refused: $f is outside brain/ me/ ai-craft/"; exit 1 ;;
  esac
  [[ "$f" == *..* ]] && { echo "refused: $f"; exit 1; }
done

# Anything already staged that isn't ours would ride along. Stop instead.
others=$(git diff --cached --name-only | grep -vxF -f <(printf '%s\n' "$@") || true)
[ -n "$others" ] && { echo "refused: other files already staged:"; echo "$others"; exit 1; }

git add -- "$@" || exit 1
git diff --cached --quiet && { echo "nothing to commit"; exit 2; }
git commit -q -m "$msg" || { echo "commit blocked (pre-commit scan). Fix the wording, don't --no-verify"; git reset -q -- "$@"; exit 1; }
echo "committed $(git rev-parse --short HEAD): $msg"
if git remote get-url origin >/dev/null 2>&1; then
  git push -q 2>&1 && echo "pushed" || echo "push failed (offline/auth?); the next retro will push it"
fi
exit 0
