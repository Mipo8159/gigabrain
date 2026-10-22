---
name: shared-library-dependency-updates
description: "Updating dependencies inside a library many services install: its lockfile never reaches them, a 0.x minor bump can change emitted data (span attribute names), and a new major can raise the Node floor. Measure output before/after; check consumers' Node and lockfiles."
metadata:
  type: feedback
---

**In short:** a "security update" in a shared library is three separate
questions. Who actually receives it? Does it change what the library emits?
Can consumers still run it?

**Why:** 2026-10-22/23, a work repo: a shared OpenTelemetry bootstrap library
imported by ~26 services, with a request to "include the latest security
updates".
- **The lockfile doesn't ship.** A library's `package-lock.json` isn't used when
  consumers install it. Refreshing transitive packages (protobufjs, grpc-js)
  cleared the library's own `npm audit` (1 critical, 10 high), but every service
  keeps the versions pinned in its own lockfile. Claude had told the user the
  opposite; the reviewer agent caught it.
- **A 0.x minor bump changed the output.** Moving the OTel experimental line
  0.208 → 0.223 renamed HTTP span attributes (`http.method` →
  `http.request.method`, `http.url` → `url.full`). This was measured by
  decoding exported spans before and after; the changelog said the same for DB
  spans. Dashboards and alerts that filter on the old names would go silently
  empty. It also needed a constructor change (`BatchLogRecordProcessor({ exporter })`).
- **The next major raised the Node floor.** The 3.0 / 0.300 line requires Node
  ≥ 22.15; consumers ran 22.9 and 22.14. `npm view <pkg>@<v> engines` showed it in seconds.
- **A middle path existed.** `npm update <3 packages>` within existing ranges
  cleared the critical and highs with no package.json change and no output change.

**How to apply:**
- Run `npm audit --omit=dev` on the current lock, then on each candidate (in a scratch copy), and list what each option clears.
- For every candidate, check `engines.node` against consumers' Dockerfiles or `.nvmrc`.
- Measure emitted output before and after (decode spans, compare responses). Don't rely on the changelog alone.
- Say plainly in the PR that consumers get transitive fixes only by refreshing their own lockfiles.
- Check consumers' lockfiles: services that commit one opt in to a new library version; a service with no lockfile picks it up on its next build.

**Signal:** "include security updates" / `npm audit fix` in a repo that is a published library, not an app.
**Next time:** open with the three questions, and show measured audit counts and output diffs per option.

Related: [[prove-the-built-artifact-runs]], [[outward-claims-carry-their-proof]].
