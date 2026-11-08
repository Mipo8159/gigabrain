# Context engineering: what actually reaches the model (slug: ai-context)

Researched 2026-11-06 by the `researcher` agent against live Anthropic docs (platform.claude.com,
code.claude.com) and the engineering post "Effective context engineering for AI agents"
(2025-09-29). Lesson 2 of the AI-engineering series. Token counts marked illustrative are not
measured; `/context` gives real ones.

## Mental model
1. Stateless: the client resends system, tools and every prior turn on each request. Claude Code
   "re-sends the full context: the system prompt, your project context, every prior message and
   tool result, and your new message." [CC prompt-caching]
2. Request shape: `model`, `max_tokens`, `system`, `tools` (name, description, input_schema),
   `messages` [{role user|assistant, content: string | blocks}]. Blocks: text, image, document,
   thinking, tool_use (assistant), tool_result (user, tool_use_id, is_error). [Messages API]
3. A tool call is two more messages: tool_use out, tool_result back in a user turn. The model
   never executes anything.
4. Everything counts toward the window: system, all messages incl. tool results/images/docs,
   tool definitions, and the output incl. thinking. [context-windows]
5. Current window: 1M tokens on the Claude 5 family, Fable/Mythos, Opus 4.6+ and Sonnet 4.6;
   128k max output.
6. More is not better: "As token count grows, accuracy and recall degrade, a phenomenon known as
   context rot." A finite "attention budget" with diminishing returns.
7. Context engineering ⊃ prompt engineering: curate everything in the window; aim for "the
   smallest set of high-signal tokens that maximize the likelihood of your desired outcome".
8. Levers: just-in-time retrieval (keep paths/ids, load via tools), compaction, structured notes
   outside the window, sub-agents with clean windows returning a distilled summary.
9. Cached tokens still occupy the window; caching changes price, not size.
10. Claude 4.7+ tokenizer: ~30% more tokens for the same text.

## Prompting techniques (mechanics)
- Role in system prompt focuses behaviour ("even a single sentence makes a difference").
- XML tags give unambiguous boundaries (`<instructions>`, `<context>`, `<document>`).
- Few-shot: "one of the most reliable ways to steer format, tone, structure"; the model also
  copies incidental features of examples (inference, not a doc quote).
- Long context: put documents first, query last ("up to 30%" better in tests).
- Chain-of-thought = visible reasoning you prompt for. Extended/adaptive thinking = `thinking`
  blocks, billed as output, counted in the window. Manual `budget_tokens` deprecated on 4.6,
  400 on 4.7+; use `thinking:{type:"adaptive"}` + `effort`. Interleaved thinking automatic.
  Claude Code: thinking can't be turned off on 5.5/Fable; use `/effort`.
- Prefill (a partial last assistant message) returns 400 from Claude 4.6 on. Use instructions,
  XML, structured outputs or tools.
- Structured outputs (stable): `output_config.format = {type:"json_schema", schema}`; `strict:true`
  on tools. No recursive schemas, no min/max constraints, `additionalProperties:false`. Changing
  the schema invalidates the cache.

## Prompt caching
- Exact prefix match, cumulative; order tools → system → messages; a change invalidates that
  level and everything after. Output identical with or without caching.
- `cache_control:{type:"ephemeral"}` top-level (auto, moves forward) or on up to 4 blocks.
  Lookback 20 blocks. A breakpoint on a block that changes each request never hits.
- TTL 5 min (refreshed free on read) or `ttl:"1h"`.
- Price vs base input: 5-min write 1.25×, 1-h write 2×, read 0.1× (0.05× Opus/Sonnet 5.5,
  0.025× Fable/Mythos 5.1).
- Minimum cacheable: 512 tokens (Claude 5 family), 1,024–4,096 on older models; shorter is
  silently not cached (check `cache_read_input_tokens`).
- Invalidators: any tool-definition change (all), tool_choice/images (tools+system), thinking or
  effort config, output format, context clearing, different model or speed.
- Worked (illustrative, $5/MTok base): 10 requests × 20k prefix: no cache $1.00; cached
  1 write $0.125 + 9 reads $0.09 = $0.215 (~78% less).
- Claude Code: system+tools → project context (CLAUDE.md, auto memory, rules) → conversation.
  Skills, plan mode, output style append as messages (cache-safe); MCP-set change, model switch,
  fast mode, /compact miss. Editing CLAUDE.md mid-session doesn't apply until /clear, /compact or
  restart. Default TTL 1 h on subscription main thread; 5 min on API key, subagents, compaction.

## Limits and degradation
- Overflow: input > window → 400; on 4.5+ input+max_tokens > window → stop_reason
  `model_context_window_exceeded`.
- API server-side compaction (beta, 4.6+); context editing (beta: clear old tool uses at 100k,
  keep 3; clear thinking); memory tool (client-side files under /memories; ≠ Claude Code auto memory).
- `count_tokens` free, estimate, rate-limited.
- Claude Code: auto-compact near the limit, `/compact [focus]`, `/rewind`, `/clear`, `/context`.
- "Lost in the middle" (Liu 2023) is academic, not an Anthropic source.

## Claude Code loading
- CLAUDE.md: cwd and every parent, concatenated root → cwd (closest read last); subdirectory
  files load on demand when Claude touches that directory; `@imports` expand at load (depth 4),
  no saving in cost; HTML block comments stripped; keep under ~200 lines; "context, not enforced
  configuration".
- Auto memory: first 200 lines / 25 KB each session; subagents don't load it.
- Skills: only description (+when_to_use, cap 1,536 chars) always in context; body on invoke and
  stays; supporting files on demand; scripts executed not loaded; `disable-model-invocation`
  hides the description; after compaction invoked skills re-attach (5k each, 25k total).
- Subagents: own window, system prompt, tools; see none of the parent conversation; load
  CLAUDE.md (Explore/Plan skip it), not auto memory; only the final report returns.
- Hooks: deterministic shell commands at lifecycle points; PreToolUse can block or rewrite; can
  filter tool output before the model sees it.
- MCP tools deferred by default (tool search): names only until used.
- After /compact: root CLAUDE.md, unscoped rules, auto memory, skill descriptions, plan
  re-injected; nested CLAUDE.md and `paths:` rules reload only on demand; up to 5 recent files
  re-read. Rules that must persist → root CLAUDE.md.

## Traps
1. Longer prompt is always better → context rot. 2. It remembers my last session → stateless.
3. CLAUDE.md guarantees compliance → context, not enforcement; use hooks/permissions.
4. All skills are loaded → descriptions only. 5. Caching changes output → identical.
6. Caching is automatic for any prompt → minimum length; volatile breakpoints never hit.
7. Examples only help → copied incidentals. 8. Prefill `{` for JSON → 400; structured outputs.
9. Subagents see my conversation → only the delegation prompt + CLAUDE.md.
10. Editing CLAUDE.md mid-session applies now → after /clear, /compact or restart.
11. /compact or model switch is free → full uncached re-read; nested rules drop.
12. Thinking budget is the knob → adaptive + effort.

## Worked example (illustrative): one Claude Code turn, turn 6
system+built-in tools 10–15k · MCP names 1–3k · skill descriptions 1–2k · CLAUDE.md+memory 3–8k ·
git/env 0.5–1k · turns 1–5 incl. tool results 25–60k · on-demand nested CLAUDE.md/skill 1–5k ·
new message ~20 · output+thinking 1–4k. One "turn" = 5–15 API requests, each re-reading the
cached prefix. A subagent returns ~0.5–2k of summary.

## Sources (live 2026-11-06)
anthropic.com/engineering/effective-context-engineering-for-ai-agents · platform.claude.com/docs/en/
api/messages · build-with-claude/{context-windows, prompt-caching, extended-thinking,
structured-outputs, context-editing, token-counting} · build-with-claude/prompt-engineering/
claude-prompting-best-practices · agents-and-tools/tool-use/memory-tool · code.claude.com/docs/en/
{memory, skills, sub-agents, costs, context-window, prompt-caching, hooks-guide}.
Unverified: whether CLAUDE.md is a system block or a user message (don't teach it).
