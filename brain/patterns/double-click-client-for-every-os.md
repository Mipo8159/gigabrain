---
name: double-click-client-for-every-os
description: "Shipping a click-to-run helper to a non-technical user on Windows, macOS and Linux: no single file runs on all three; Go cross-compiled in Docker, one launcher per OS, reproducible builds committed to git, config in .env, git clone avoids the unsigned-binary warnings."
metadata:
  type: feedback
---

**Rule:** "one exe for every OS" doesn't exist: PE, Mach-O and ELF differ, and double-click needs `.exe` on
Windows and `.command`/`.app` on macOS. Say so before building, and offer one click-file per OS.

**How to apply:**
- **Go, built in `golang:<ver>-alpine` via Docker**: no toolchain on the host, one static file per OS/arch, no
  runtime for the user. `CGO_ENABLED=0 GOOS=… GOARCH=…`.
- **Layout:** `App.exe` (Windows) + `App.command` (macOS *and* Linux: `uname -s`/`-m` picks `bin/<os>-<arch>`,
  passes the folder as home) + `bin/` + `src/` + `build.sh`. The program resolves its folder via
  `os.Executable()` (+ EvalSymlinks), never the cwd: a macOS double-click starts in `$HOME`.
- **Reproducible builds** (`-trimpath -buildvcs=false -ldflags "-s -w -buildid="`): unchanged source gives
  byte-identical binaries, so committing them to git causes no churn. Check: build twice, `sha256sum -c`.
- **git keeps the exec bit** (100755) only if it was set when added; `.gitattributes`: `*.command eol=lf`,
  binaries `binary`. A CRLF launcher won't run on macOS.
- **Config:** a committed `.env.example`, a git-ignored `.env`, and env vars of the same name override the file
  (tests, CI). Errors say exactly which key to fill in.
- **Unsigned warnings** (SmartScreen, Gatekeeper) come from the browser's download mark. `git clone` doesn't set
  it, so prefer clone; otherwise document "More info → Run anyway" / Privacy & Security → "Open Anyway".
- Windows: keep the console open at the end ("Press Enter"), or a double-clicked error flashes and vanishes.

**Why:** 2026-10-14: the packaging target moved from exe → zip kit per OS → "one exe for all" → git repo + .env
within one session; each move was a rebuild. The answers above were what survived. Real runs on the Linux build
and the macOS launcher (driven on Linux) passed; Windows and Mac binaries were format-checked only.
**Signal:** "an exe the client double-clicks", "works on Windows, Mac and Linux", "upload the kit to GitHub".
**Next time:** ask the distribution channel (zip, git repo, store) and who configures it in the first question
batch, and state the one-file impossibility then.
