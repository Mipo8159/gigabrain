---
name: prove-the-built-artifact-runs
description: "For bundled TypeScript and for dependency upgrades, tsc + packaging green proves nothing: run the built bundle, invoking each handler/event shape once. Bundlers drop decorator metadata (DI resolves undefined); 'ESM-only' is not a version ceiling under a bundler."
metadata:
  type: feedback
---

**In short:** in a bundled service, the proof is the *built* artifact running,
not `tsc` or the package step. Invoke it once per handler shape.

**Why (Aug 2026, one serverless TypeScript project, three misses with green static checks):**
- esbuild doesn't emit `design:paramtypes`, so constructor DI (tsyringe,
  Inversify, NestJS) resolved `undefined`: every endpoint in two services would
  have failed at runtime. The fix lives in the build layer (an SWC esbuild
  plugin), not the source. Claude first treated esbuild as unchangeable.
- A middleware upgrade (middy 4→7) broke 4 of 8 handlers: its body parser became
  strict and rejected GETs with no body.
- Claude recorded two false "can't upgrade past X" ceilings because the newer
  releases were ESM-only. Building and running the bundle disproved both.

**How to apply:**
- After a build-config or dependency change, run a probe of the built bundle:
  one call each for a GET with no body, a JSON POST, a scheduled event, an
  authorizer (whatever shapes the service has).
- DI + bundler: assert the injected dependency is defined in that probe.
- Before writing a version ceiling into notes, build and run with the newer version.

**Signal:** "tsc passes and it packages" offered as the proof for a bundled service.

Related: [[scripts-run-on-mac-and-linux]] (green that isn't real), [[import-knowledge-on-demand]].
