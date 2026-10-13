#!/usr/bin/env bash
# Unit-tests every process grader without a model: builds the solution workdir the way
# bin/eval-knowledge does (fixture -> git commit -> setup.sh -> solution overlay), then runs the
# check with EVAL_TRANSCRIPT=good.jsonl (must pass) and bad.jsonl (must fail).
# cleanup-keeps-ports grades the workdir only: its "bad" is hidden/fixtures/bad-overlay instead.
# Also checks every hidden/lib.cjs is identical to _lib/lib.cjs.
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
bad=0

workdir() {  # $1 case dir, $2 extra overlay (optional) -> prints workdir path
  local wd="$TMP/$(basename "$1")-$RANDOM/work"
  mkdir -p "$wd" && cp -R "$1/fixture/." "$wd/"
  (cd "$wd" && git init -q && git add -A && git -c user.email=e@x -c user.name=eval commit -qm fixture)
  [ -f "$1/setup.sh" ] && (cd "$wd" && bash "$1/setup.sh") >/dev/null 2>&1
  cp -R "$1/solution/." "$wd/"
  [ -n "${2:-}" ] && cp -R "$2/." "$wd/"
  cp -R "$1/hidden" "$wd/hidden"
  echo "$wd"
}

check() {  # $1 label, $2 want(0 pass / 1 fail), $3 workdir, $4 transcript or ""
  local got
  (cd "$3" && EVAL_TRANSCRIPT="${4:-/nonexistent}" EVAL_FINAL=/nonexistent node hidden/grade.cjs) > "$TMP/log" 2>&1
  got=$?; [ $got -ne 0 ] && got=1
  if [ "$got" = "$2" ]; then echo "  ok   $1 ($( [ $got = 0 ] && echo pass || echo fail))"
  else echo "  BAD  $1: expected $( [ $2 = 0 ] && echo pass || echo fail)"; sed 's/^/       /' "$TMP/log"; bad=1; fi
  grep -E '^FAIL' "$TMP/log" | sed 's/^/         /' | head -3
}

for c in "$HERE"/*/; do
  c="${c%/}"; [ -f "$c/task.md" ] || continue
  name="$(basename "$c")"; echo "$name"
  cmp -s "$HERE/_lib/lib.cjs" "$c/hidden/lib.cjs" || { echo "  BAD  hidden/lib.cjs differs from _lib/lib.cjs"; bad=1; }
  if [ -d "$c/hidden/fixtures/bad-overlay" ]; then
    check "solution workdir" 0 "$(workdir "$c")" ""
    check "bad-overlay workdir" 1 "$(workdir "$c" "$c/hidden/fixtures/bad-overlay")" ""
  else
    check "good.jsonl" 0 "$(workdir "$c")" "$c/hidden/fixtures/good.jsonl"
    check "bad.jsonl" 1 "$(workdir "$c")" "$c/hidden/fixtures/bad.jsonl"
  fi
done
exit $bad
