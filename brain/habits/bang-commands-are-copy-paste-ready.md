---
name: bang-commands-are-copy-paste-ready
description: "Commands handed to Giga to run with `!` must be copy-paste ready: no <placeholder> (zsh reads < > as redirection and dies with 'parse error near |'), no trailing question on the same line (zsh globbed 'right?'). A value Giga must supply (MFA code) goes as an obvious example plus 'change only the digits', or better a wrapper that validates the input."
metadata:
  type: feedback
---

**In short:** when Giga needs to run something with `!`, give them the exact
line, ready to paste. If the command needs a value only Giga has, give a
validating wrapper (`tl-aws 123456`), or a line with a realistic example and
"change only the digits". Never use a `<placeholder>` in a command meant to
be pasted.

**Why:** 2026-10-22, one credentials refresh:
- `<mfa>` was typed literally, then `<007022>`, then `<374370>`. zsh read
  `<…>` as a redirection, and each try died with `parse error near |`.
- When the line was finally right, `123456` was the example value itself.
- Then a question was typed after the ECR login command on the same `!`
  line. zsh globbed `right?`, and the pipe broke.

Five rounds went to syntax rather than the task. None of it leaked, but only
because each failure happened before the command ran.

**How to apply:**
1. In any `!` line Claude writes, no `<…>`, no `{…}` placeholders, no
   trailing prose. One command per code block.
2. A value Giga must supply → prefer a wrapper that checks the input format
   and prints its usage hint (`^[0-9]{6}$`). Otherwise give a filled-in
   example and say exactly which characters to replace.
3. After a parse error, give Giga the corrected full line with their value
   filled in. Re-explaining the placeholder rule doesn't help.

**Signal:** Claude is about to write `! <cmd> <something>` for Giga.
**Next time:** write it as Giga will paste it. If Giga will run it more than
twice, ship a validating wrapper instead.

Related: [[secrets-land-in-readme]], [[invisible-chars-get-written-literally]]
