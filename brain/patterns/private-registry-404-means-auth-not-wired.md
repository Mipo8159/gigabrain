---
name: private-registry-404-means-auth-not-wired
description: "npm 404 on a private scoped package inside a Docker build means the token never reached the build, not that the package is missing; check the token directly against the tarball, then check how the build receives it (build arg vs BuildKit secret mount). Also: zsh doesn't word-split unquoted variables, so a test built from a flag string silently drops auth."
metadata:
  type: project
---

**In short:** a 404 for `@org/pkg` from a private registry is the registry
hiding a package from an unauthenticated caller. Prove the token is good
outside the build, then find where the build loses it.

**Why:** 2026-10-20, a dependency-install step failed on ~30 service
builds with `npm error 404 … @org/pkg-x.y.z.tgz - Not found`.
- The same token fetched that exact tarball with HTTP 200 from the host, and
  no "variable is not set" warning appeared, so the token *was* in the
  environment.
- The cause was a half-done migration. The services' Dockerfiles had moved to
  `RUN --mount=type=secret,id=npm-token` (reads `/run/secrets/npm-token`), and
  the compose root already defined the secret from `$NPM_TOKEN`. But only one
  service's compose file added `build: secrets: [npm-token]`; the others still
  passed the token as a build arg the Dockerfile no longer read. Every new
  machine would hit this.
- A first diagnostic of mine was itself wrong: in zsh,
  `R="--a --b=$T"; npm whoami $R` passes **one** argument (zsh doesn't
  word-split unquoted variables), so npm saw no token and said "requires you
  to be logged in", which looked like a dead token. Retesting with an array
  (`A=(--a --b="$T"); npm … "${A[@]}"`) proved the token fine.

- 2026-10-21, two more variants of the same cause: (a) a Dockerfile copied
  `.npmrc` *after* `npm/yarn install`, so the install ran without the registry
  auth line and 404'd; (b) builds that still pass the token as a build `ARG`
  bake it into `docker history` of every image, readable by anyone who pulls it.
  A secret mount (`RUN --mount=type=secret,id=…,uid=<user>`) fixes both. A compose
  override's `args: !reset {}` did not remove the inherited args (the resolved
  config still listed the token), so check the image, not the YAML.

**How to apply:**
1. Test the token directly against the failing URL (`curl -H "Authorization: Bearer …" <tarball>`,
   printing only the status code). 200 means the token is fine and the problem is plumbing.
2. Grep the Dockerfiles for `--mount=type=secret` and the compose files for
   `secrets:`. A Dockerfile that reads a secret needs the matching `build: secrets:` entry
   (one line under the shared `x-` anchor covers every variant).
3. Fix one service first and prove its build passes before touching the rest.
4. When building a diagnostic command in zsh, put flags in an **array**, never a
   space-joined string. Treat a surprising "not logged in" from your own probe as
   a probe bug until the token fails a direct test.

5. Check the Dockerfile copies `.npmrc` (or `.yarnrc`) **before** the install line.
6. After any fix, count token-shaped strings in `docker history --no-trunc <img>`
   (`grep -c`, never print). Non-zero means the token is baked in; rebuild with a secret mount.

**Signal:** `E404` on an `@org/…` package during `docker build` / `npm install` in a container.
**Next time:** curl the tarball with the token → grep `--mount=type=secret` vs compose `secrets:` → fix one, prove, then fan out.
