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
- Transcripts older than `cleanupPeriodDays` are gone. Install raised it to
  365 on 2026-10-12, so earlier months can't be re-scored.

**How to apply:** reuse `bin/usage-report`'s `scan()` rather than writing
another parser. When the format changes, test the fix against a real
transcript and compare with a hand count of message ids.

**Signal:** "how often do I…", scorecard re-scoring, token or cost questions,
"which skills fire".
**Next time:** cross-check a total two ways (records vs unique ids) before
quoting it, as in [[reconcile-against-an-independent-total]].
