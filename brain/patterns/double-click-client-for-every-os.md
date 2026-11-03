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
  it, but a non-technical client has no git: ship a zip of the click-files named one by one (so `.env` and data
  never ride along), shared to one email, the key sent separately. Document "More info → Run anyway" /
  Privacy & Security → "Open Anyway", and "unzip first".
- **Remembered state lives next to the program**, never in the user config dir. A list kept in `%AppData%`
  made a fresh unzip say "up to date" over an empty folder, and the user called it a bug. The user's model is
  "this folder is my copy". When a fresh folder re-downloads data that an append-only importer already has,
  warn on screen before they import it twice.
- **Data files a person double-clicks:** Excel opens a UTF-8 CSV without BOM as gibberish, splits on the
  locale's separator, and turns long digit strings into `4.8E+12`. Keep the import CSV as the importer wants
  it and add a separate `.xlsx` copy for viewing (IDs, barcodes, phones as text cells). For a non-Latin script,
  write the import CSV as UTF-8 **with** BOM: 2026-11-03 the BOM had been held back "until a test import proves it",
  and the Windows client then hit all three failures (garbled script in Excel, one column, and garbled text after
  the CRM import, from the wizard's encoding guess or an Excel re-save). Enforce the BOM in the last program before
  the person (the downloader), whatever the server sent, and make the test reader fail on a file without it. A
  separator or number-format fix can't live in the CSV (a `sep=` line breaks importers): put "never open/save in
  Excel; choose UTF-8 + comma in the import" in the program's closing message, where a non-technical user reads.
- Windows: keep the console open at the end ("Press Enter"), or a double-clicked error flashes and vanishes.

**Why:** 2026-10-14: the packaging target moved from exe → zip kit per OS → "one exe for all" → git repo + .env
within one session; each move was a rebuild. The answers above were what survived. Real runs on the Linux build
and the macOS launcher (driven on Linux) passed; Windows and Mac binaries were format-checked only.
2026-11-01/02: the client had no git (zip via a restricted link instead), saw garbled CSVs in Excel (fixed with
an `.xlsx` copy, read back through LibreOffice: 0 differences on 83k rows), and hit "up to date" after re-unzipping
because the download list lived in `%AppData%` (moved next to the program).
**Signal:** "an exe the client double-clicks", "works on Windows, Mac and Linux", "upload the kit to GitHub".
**Next time:** ask the distribution channel (zip, git repo, store), who configures it, and whether they will open
the output files themselves, in the first question batch; state the one-file impossibility then.
