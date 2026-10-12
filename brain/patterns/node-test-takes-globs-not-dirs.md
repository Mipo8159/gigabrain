---
name: node-test-takes-globs-not-dirs
description: On Node 26, `node --test test/` treats the directory as one test file and fails with a single anonymous error; use bare `node --test` (auto-discovers) or a glob.
metadata:
  type: feedback
---

`"test": "node --test test/"` printed `✖ test … 'test failed'`, pass 0 fail 1,
with no stack, on Node v26.5.0 (2026-10-12). Bare `node --test` discovers
`test/**/*.test.js` and ran 5/5. Running one file directly
(`node --test test/x.test.js`) showed the real cause behind the next failure
(a missing `pg` module, because the service required the DB at load time).

**Why:** the anonymous failure hides both problems; it cost two runs to see it.

**How to apply:** use `node --test` or `node --test 'test/**/*.test.js'` in
package.json. When node:test reports one nameless failure, run a single file
directly to get the real error.

**Signal:** `node:test` output with a lone `✖ test` and no assertion message.
**Next time:** drop the directory argument; run one file to surface the stack.
