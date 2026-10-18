#!/usr/bin/env bash
# UserPromptSubmit: make the model decide on skills before it answers ("forced
# eval", after scottspence.com, Feb 2026). NOT installed by default: it only
# goes into settings if bin/eval-forced shows it beats the plain descriptions
# on evals/skills-hard without loading skills on small prompts.
cat <<'MSG'
Before answering: check the available skills against this prompt. If one clearly fits what is asked (not just a word in it), load it with the Skill tool first, then answer. If none fits, answer directly and do not mention this check. Small talk, thanks and one-line edits need no skill.
MSG
