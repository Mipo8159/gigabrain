---
name: reading-claude-transcripts
description: "Parsing ~/.claude/projects/*.jsonl for usage stats: dedupe assistant usage by message.id (2-3x over-count otherwise), slash commands are user strings with <command-name>, skip isCompactSummary and interrupt rows, and filter eval/temp dirs by name prefix."
metadata:
  type: reference
---

**In short:** Claude Code transcripts are not one row per turn. Count them
naively and every number comes out wrong.

**Why:** 2026-10-17, building `bin/usage-report`. The reviewer reproduced
each of these on real transcripts:
- **One assistant record per content block.** Each one repeats the same
  `message.id` and `usage`. On the largest transcript that was 709 records for
  322 messages, so tokens were over-counted 2.2× (130M vs 58.6M input).
  Count usage once per `message.id`. A max (peak context) is not affected.
- **Slash commands** are user records whose string content is
  `<command-message>retro</command-message>\n<command-name>/retro</command-name>`.
  A `startswith("<command-name>")` check missed all six `/retro` runs. Search
  for `<command-name>` anywhere in the first few hundred characters.
- **Not typed by Giga:** `isCompactSummary: true` rows, `[Request interrupted…`
  rows, `isMeta`, `isSidechain`, and list content whose first block is a
  `tool_result`.
- **Eval and temp sessions** live in dirs named `-private-…`,
  `-var-folders-…` and `-tmp-…` (482 dirs here). Filter by prefix. A
  substring match would drop a real `…-projects-my-private-api`.
- **Hook output** is stored as `attachment.type == "hook_additional_context"`
  with a `content` list. `/resume` replays it without re-running the hook.
- **Minute-by-minute "was Claude working" rebuilds** (2026-11-24, lone-wait
  vs team usage chart): pairing each prompt with the next `end_turn` gave
  155h of lone wait over 30 days, about 2.6× too much, because interrupted or
  killed turns never close and stretch across nights. Count only gaps of
  ≤ 10 min between consecutive records inside a turn (that dropped 173h). Other
  details: `promptSource: "system"` is a turn the human didn't start
  (wakeups, task notifications); `session-owner.accountUuid` splits work
  from personal accounts; sessions from before late October have no owner row.
  Even after the fix, absolute hours ran about 2× the team chart's, so
  compare its % and the trend, never its hours (`bin/wait-report`).
- Transcripts older than `cleanupPeriodDays` are gone. Install raised it to
  365 on 2026-10-12, so earlier months can't be re-scored.

**How to apply:** reuse `bin/usage-report`'s `scan()` rather than writing
another parser. When the format changes, test the fix against a real
transcript and compare with a hand count of message ids.

**Signal:** "how often do I…", scorecard re-scoring, token or cost questions,
"which skills fire".
**Next time:** cross-check a total two ways (records vs unique ids) before
quoting it, as in [[reconcile-against-an-independent-total]].
