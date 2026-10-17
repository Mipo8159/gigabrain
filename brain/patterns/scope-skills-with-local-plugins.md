---
name: scope-skills-with-local-plugins
description: "Off-stack skills go in opt-in plugins of a local directory marketplace (loaded in place, enabled per repo with --scope local), not ~/.claude/skills; prove skill triggering with `claude plugin eval` using --ablation none and a staged copy."
metadata:
  type: reference
---

**In short:** every global skill's description costs context in every session (a NestJS
repo listing Cisco skills is noise), so off-stack skills go in opt-in local
plugins.

Phase 1 (2026-10-12), checked against the live docs and CLI 2.1.x:

- **Opt-in bundles:** `library/.claude-plugin/marketplace.json` with
  relative-path plugins. A marketplace added from a local path loads them **in
  place**: edits apply at the next session or `/reload-plugins`, with no
  version bump. Enable one per repo with
  `claude plugin install <p>@gigabrain --scope local`, which writes
  `enabledPlugins` to the gitignored settings.local.json. A disabled plugin
  costs no context.
- **Plugin files must be real.** A symlink that escapes the plugin root is
  rejected, so the generator writes the skill into the plugin directory.
- **Names get a prefix:** `/<plugin>:<skill>`. Keep the skills you call by
  name (`/retro`) global, and rewrite cross-references to the prefixed form.
- **Evals:** `claude plugin eval` runs isolated, with no user skills, settings
  or CLAUDE.md, so stage a throwaway plugin copy of the skills under test.
  A trigger check is `type: tool_used`, `tool: Skill`, with
  `input_match: '"skill"\s*:\s*"(?:[\w-]+:)?<name>"'`. It is **unscored** in
  the default with/without-baseline mode, so pass `--ablation none`. Negative
  case: `min: 0`, `max: 0`, `arm: both`. 9 cases × 2 runs cost ~$1.80.

**Why:** proved on a scratch Nest repo: 0 opt-in skills without the plugin,
exactly the 10 prefixed ones with it. Trigger evals 9/9.

- **Stage the brain too (2026-10-17).** Isolated evals can't see the most
  likely miss: Giga's own context talking the model out of a skill. With the
  same retro sign-off prompts, 11 skills gave 6/6 and 42 skills gave 6/6, but 42
  skills plus CORE.md and the coach hook gave **0/6**. The replies quoted the
  cue ("offer it in ONE line"). Live: 0 of 3 clear chances in 6 days. A rule
  that says "suggest/offer /X" turns a skill into a reminder; write "load
  skill X and run it" instead. Listing size was ruled out. Harness:
  `evals/skills-live/run.sh` (arms s11, s42, s42ctx), ~$12 for the study.

**How to apply:** a newly absorbed skill outside the daily stacks goes into a
`library/plugins.json` bundle. Rerun `bin/eval-skills` after editing a global
skill's description.

**Next time:** a skill that never fires live: rerun the s42ctx arm, and grep
CORE.md and coach.py for "suggest" or "offer" next to its name.

**Signal:** "too many skills", skills from the wrong domain showing up, a
skill not firing on natural phrasing, a new `/absorb` source.

**Next time:** check `claude plugin details <p>` for token cost, and add a
trigger case before you edit a description.

Related: [[claude-config-changes-need-human-installer]], [[import-knowledge-on-demand]]
