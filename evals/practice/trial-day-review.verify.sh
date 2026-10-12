#!/usr/bin/env bash
# Proves every planted bug in practice-trial-day-review is live.
# Each line prints "PLANTED" when the bug reproduces, "MISSING" when it does not
# (a MISSING row means the fixture drifted from trial-day-review.key.md).
# Needs the stack running on a fresh volume:
#   cd ~/Desktop/workdir/sweeft/practice-trial-day-review && docker compose down -v && docker compose up --build -d
set -uo pipefail

REPO="${REPO:-$HOME/Desktop/workdir/sweeft/practice-trial-day-review}"
API="${API:-http://localhost:8080}"
fails=0

b64url() { printf '%s' "$1" | base64 -w0 | tr '+/' '-_' | tr -d '='; }
# Unsigned garbage signature: only accepted because auth uses jwt.decode.
forge() { echo "$(b64url '{"alg":"HS256","typ":"JWT"}').$(b64url "$1").not-a-real-signature"; }

TOKEN=$(forge '{"email":"mallory@example.com"}')
FRESH=$(forge "{\"email\":\"new@example.com\",\"exp\":$(( $(date +%s) + 3600 ))}")
H=(-H "Authorization: Bearer $TOKEN" -H "X-Client-ID: verify-client" -H "Content-Type: application/json")

check() { # id, description, condition-exit-code
  if [ "$3" -eq 0 ]; then printf 'PLANTED  %-4s %s\n' "$1" "$2"; else printf 'MISSING  %-4s %s\n' "$1" "$2"; fails=$((fails+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
mkissue() { curl -s "${H[@]}" -X POST "$API/issues" -d "$1" | jq -r '.issue.id'; }
patch() { curl -s "${H[@]}" -X PATCH "$API/issues/$1" -d "$2" >/dev/null; }
revs() { curl -s "${H[@]}" "$API/issues/$1/revisions"; }

curl -sf "$API/health" >/dev/null || { echo "API not reachable at $API"; exit 2; }

# --- security ---
[ "$(code -H "Authorization: Bearer $TOKEN" "$API/issues")" = 200 ]; check S1 "forged token (bad signature) accepted: jwt.decode, not verify" $?
[ "$(code "$API/issues?x=health")" = 200 ]; check S2 "no token but ?x=health in URL -> 200 (url.includes bypass)" $?
[ "$(code -H "Authorization: Bearer $FRESH" "$API/issues")" = 401 ]; check S3 "token valid for 1 more hour rejected as expired (exp seconds < Date.now ms is always true)" $?
n=$(curl -s "${H[@]}" "$API/issues?sort=id%20LIMIT%201%20%23" | jq '.issues | length')
[ "$n" = 1 ]; check S4 "SQL injection via sort: 'id LIMIT 1 #' rewrites the query" $?
[ "$(code "${H[@]}" "$API/issues?limit=-1")" = 500 ]; check S4b "limit=-1 reaches SQL unvalidated -> 500" $?
logs=$(cd "$REPO" && docker compose logs api 2>/dev/null); [[ "$logs" == *"with token ey"* ]]; check S5 "bearer token written to stdout" $?
grep -q "JWT_SECRET || 'testlio-trial-day-secret'" "$REPO/config.js"; check S6 "hard-coded JWT secret fallback in config.js" $?
FID=$((700000 + RANDOM * 10 + RANDOM % 10))
forced=$(curl -s "${H[@]}" -X POST "$API/issues" -d "{\"title\":\"mass\",\"id\":$FID,\"updated_by\":\"forged@example.com\"}" | jq -r .issue.id)
[ "$forced" = "$FID" ]; check S7 "mass assignment: client chooses id / updated_by" $?

# --- functional / spec ---
A=$(mkissue '{"title":"A","description":"a1"}'); patch "$A" '{"title":"A2"}'
last=$(revs "$A" | jq -r '.revisions[-1].changes')
[ "$last" = '{}' ]; check F1 "update revision stores empty diff ('before' aliases the instance)" $?
B=$(mkissue '{"title":"B","description":"b1"}'); patch "$B" '{"title":"B2"}'
# A's revisions and B's revisions are interleaved by id; ask A for a range that ends in B's rows.
first=$(curl -s "${H[@]}" "$API/issues/$A/compareRevisions?from=1&to=1000000" | jq -r '.after.id')
[ "$first" != "$A" ]; check F2 "compare on issue A returns another issue's state (no issue_id filter)" $?
r=$(curl -s -w '|%{http_code}' "${H[@]}" -X PATCH "$API/issues/99999999" -d '{"title":"x"}')
[ "${r##*|}" = 500 ]; check F3 "PATCH unknown id -> 500 (notFound without return)" $?
[[ "${r%|*}" != *'"message"'* ]]; check F4 "error handler mounted after router: 500 is Koa text, not JSON" $?
t=$(curl -s "${H[@]}" "$API/issues?limit=1" | jq '.total')
[ "$t" = 1 ]; check F5 "total = page size, not row count" $?
grep -q 'Revision.count' "$REPO/lib/api/issues.js"; check F6 "N+1: Revision.count per listed issue" $?
g=$(curl -s -w '|%{http_code}' "${H[@]}" "$API/issues/99999999")
[ "$g" = '{"issue":null}|200' ]; check F7 "GET unknown issue -> 200 {issue:null}" $?
[ "$(code -H "Authorization: Bearer $TOKEN" "$API/issues")" = 200 ]; check F8 "X-Client-ID header never required (Task 5)" $?
C=$(mkissue '{"title":"C"}')
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Client-ID: some-client" -H "Content-Type: application/json" -X PATCH "$API/issues/$C" -d '{"title":"C2"}' >/dev/null
ub=$(curl -s "${H[@]}" "$API/issues/$C" | jq -r '.issue.updated_by')
[ "$ub" = some-client ]; check F9 "updated_by = X-Client-ID, not the author's email (Task 5)" $?
[ "$(code "${H[@]}" "$API/issues/$A/compareRevisions?from=2&to=1")" = 404 ]; check F10 "compare newer->older (from>to) -> 404, no reverse support" $?
total_revs=$(curl -s "${H[@]}" "$API/issues/$A/compareRevisions?from=1&to=1000000" | jq '.revisions | length')
all=$(docker exec "$(cd "$REPO" && docker compose ps -q db)" mysql -uroot -ptrialday -N -e 'select count(*) from testlio.revisions' 2>/dev/null)
[ "$total_revs" = "$((all - 2))" ]; check F11 "'revisions' trail drops both endpoints (slice(1,-1))" $?
ty=$(revs "$A" | jq -r '.revisions[0].changes | type')
[ "$ty" = string ]; check F12 "revisions list returns 'changes' as a JSON string, not an object" $?
fk=$(docker exec "$(cd "$REPO" && docker compose ps -q db)" mysql -uroot -ptrialday -N -e 'show create table testlio.revisions' 2>/dev/null)
[[ "$fk" != *"FOREIGN KEY"* ]]; check O1 "SUBMISSION claims FK revisions.issue_id -> issues.id; none exists" $?
! grep -rqi 'transaction' "$REPO/lib"; check O2 "SUBMISSION claims all writes are transactional; no transaction anywhere" $?
[ "$(code "${H[@]}" "$API/issues/$A/revisions/compare?from=1&to=2")" = 404 ]; check O3 "SUBMISSION documents /revisions/compare; real route is /compareRevisions" $?
grep -q "'some-other-secret'" "$REPO/test/issues.test.js"; check T1 "tests sign with the wrong secret and still pass (only because of S1)" $?
! grep -q 'X-Client-ID' <(sed -n '/lists the issues/,/});/p' "$REPO/test/issues.test.js"); check T2 "tests call /issues without X-Client-ID and expect 200" $?

echo; [ "$fails" -eq 0 ] && echo "ALL PLANTED" || echo "$fails MISSING"
exit "$fails"
