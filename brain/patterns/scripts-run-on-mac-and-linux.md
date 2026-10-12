---
name: scripts-run-on-mac-and-linux
description: "Giga works on a Linux box and a Mac: shell/python tooling must survive bash 3.2, BSD cp/sed, /var→/private realpaths, and per-machine absolute paths in config. A script that half-works on one OS fails silently, not loudly."
metadata:
  type: reference
---

Gigabrain moved from a Linux machine to a Mac and four things broke on the same
day (2026-10-12). Only one of them was loud:

- **bash 3.2** (`/usr/bin/env bash` on macOS): `declare -A` errors and the
  script carries on, so the secret-scan pre-commit hook printed "clean" with a
  broken pattern table. Avoid bash 4 features, or require `brew install bash`
  and check `BASH_VERSINFO` and fail loudly.
- **BSD `cp -R dir/ dst/`** copies the *contents* of `dir`, not `dir` itself.
  A glob `for c in */` gives trailing slashes: every eval case got flattened
  into one folder. Use `cp -R "${c%/}" dst/`.
- **`/var` and `/tmp` are symlinks to `/private/...`**. A tool that reports
  realpaths won't match a `tempfile` path. Call `.resolve()` on both sides.
- **`sed -i ''`** on BSD vs `sed -i` on GNU. Prefer a small python edit.
- **Absolute per-machine paths in committed config** (`sources.json` "local",
  `kit/projects.json`): resolve them with a fallback (env var, then
  `~/.cache/...`), never assume they exist.

**Why:** these failures don't crash. They produce a wrong-but-plausible result,
like a clean scan or a 1-case eval run, and those get trusted.

**How to apply:** when a gigabrain script or hook runs on a machine for the
first time, run its own check (`check-library`, `kit selftest`,
`pre-commit --all`) and read the stderr, not just the last line.

**Signal:** a new machine or OS, a `declare`/`cp -R`/`sed -i` in a diff, an
absolute `/home/...` or `/Users/...` path in a committed JSON file.

**Next time:** run the self-checks first and grep stderr for "invalid option".
Fix the portability issue before trusting any green result.

Related: [[claude-config-changes-need-human-installer]]
