---
name: scope-skills-with-local-plugins
description: "Off-stack skills go in opt-in plugins of a local directory marketplace (loaded in place, enabled per repo with --scope local), not ~/.claude/skills; prove skill triggering with `claude plugin eval` using --ablation none and a staged copy."
metadata:
  type: reference
---

Every global skill's name and description sits in context in every session. A
NestJS repo listing Cisco and homelab skills is noise. Phase 1 (2026-10-12),
checked against the live docs and a CLI 2.1.x:

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

**How to apply:** a newly absorbed skill outside the daily stacks goes into a
`library/plugins.json` bundle. Rerun `bin/eval-skills` after editing a global
skill's description.

**Signal:** "too many skills", skills from the wrong domain showing up, a
skill not firing on natural phrasing, a new `/absorb` source.

**Next time:** check `claude plugin details <p>` for token cost, and add a
trigger case before you edit a description.

Related: [[claude-config-changes-need-human-installer]], [[import-knowledge-on-demand]]
