#!/usr/bin/env bash
# SessionStart hook: if harvest candidates are piling up, tell Claude (stdout is
# added to the session context) so it can suggest /curate once.
[ -n "$GIGAFORGE_HARVEST" ] && exit 0
INBOX="$(cd "$(dirname "$(readlink -f "$0")")/../.." && pwd)/inbox"
n=$(find "$INBOX" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l)
if [ "$n" -ge 5 ]; then
  echo "gigaforge: $n harvest candidates are waiting in $INBOX. Mention once, briefly, that /curate would promote or discard them. Do not run it unasked."
fi
exit 0
