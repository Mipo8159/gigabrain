---
name: invisible-chars-get-written-literally
description: "An escape like \\ufeff written into a source file with the file tool can land as the raw invisible character; Go rejects a literal BOM in source. Write such characters via sed with escapes and grep the bytes after."
metadata:
  type: feedback
---

**Rule:** after writing source that names an invisible character (BOM `﻿`, zero-width space, NBSP), check
the bytes: `grep -c $'\xEF\xBB\xBF' file` must be 0. Fix with `sed -i 's/\xEF\xBB\xBF/\\ufeff/g' file`.

**Why:** 2026-10-14: twice in one session a Go file came out with the literal BOM where `"﻿"` was meant;
`go vet` failed with "illegal byte order mark". In JS/Python it would silently compare against the wrong string.
**How to apply:** the grep goes into the same command as the first build/test after writing such a file.
**Signal:** code that strips a Notepad BOM, or any string literal holding whitespace you can't see.
**Next time:** write the escape with sed, or check with grep before running the compiler.
