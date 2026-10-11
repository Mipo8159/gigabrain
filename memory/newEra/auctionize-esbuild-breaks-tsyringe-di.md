---
name: auctionize-esbuild-breaks-tsyringe-di
description: "Serverless v4's esbuild silently breaks auctionize's tsyringe DI — every @autoInjectable dep is undefined at runtime. THE FIX: an SWC esbuild plugin via build.esbuild.configFile, which restores decorator metadata with zero source changes."
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-15T19:32:18.520Z
  originSessionId: 09021c69-fdc0-48b0-b9a5-ac0fa7c3a534
---

Found 2026-08-14 auditing auctionize. **Every endpoint in `auction` and `auth` would fail at runtime**, and neither `tsc --noEmit` nor `sls package` catches it.

> **SOLVED 2026-08-15 — fix at the BUILD layer, not in the source.** Everything below about "three fix options" was written under the false assumption that esbuild is immovable. It isn't. **SWC implements `emitDecoratorMetadata`; esbuild never will** (it needs full type resolution, which esbuild deliberately refuses). Run SWC as an esbuild plugin and the bug disappears with **zero source edits** — no `@inject`, no container removal.
>
> **Serverless v4 supports this natively.** `build.esbuild.configFile` points at a JS file exporting a *function returning esbuild options*; verified by reading `dist/sf-core.js` in release 4.17.0 — the result is merged into `esbuildProps` and spread into `esbuild.build()`, with only `exclude`, `buildConcurrency` and `configFile` deleted. **`plugins` passes straight through.**
>
> ```js
> // esbuild.config.mjs  (build: esbuild: configFile: ./esbuild.config.mjs)
> import { transformFile } from "@swc/core";
> const swc = { name: "swc-decorator-metadata", setup(b) {
>   b.onLoad({ filter: /\.ts$/ }, async (a) => ({
>     contents: (await transformFile(a.path, { jsc: {
>       parser: { syntax: "typescript", decorators: true },
>       transform: { legacyDecorator: true, decoratorMetadata: true },
>       target: "es2022" }, module: { type: "es6" } })).code,
>     loader: "js" })); } };
> export default () => ({ plugins: [swc] });
> ```
>
> Probed against the **real unmodified `auction/src`**: plain esbuild gives `design:paramtypes = undefined` and all three deps `undefined`; with the plugin, `[AuctionRepository, ScheduleService, DateService]`, all three `object`, `dateService.formatDate()` returns a real value. **InversifyJS 8 also verified working under it**, with NestJS-style constructor injection (no explicit tokens) and `inSingletonScope()` honoured.
>
> Costs: `@swc/core` is a platform-specific Rust binary (~40MB, devDependency only, not in the Lambda artifact), one config file per service, and every `.ts` now routes through SWC rather than esbuild's TS handling — so the two must agree on target semantics.
>
> **DI choice is therefore free of build constraints now.** Maintenance data 2026-08-15: inversify 8.2.3 (2.7M/wk, released 2026-07-23, healthy), **tsyringe 4.10.0 (10.2M/wk but last released 2025-04-16 — ~16 months stale)**, awilix 13.0.5 (521K/wk, healthy). Prefer **Inversify 8** for a maintained decorator container; awilix's only real edge was surviving esbuild, which no longer matters.

The original analysis, still accurate as *diagnosis*: 

`AuctionService` and `AuthService` are `@autoInjectable()`, built by `container.resolve(...)` at module load. tsyringe's `getParamInfo` reads `Reflect.getMetadata("design:paramtypes", target)` — but **esbuild cannot emit `emitDecoratorMetadata`**, so that returns `undefined`, `params` falls back to `[]`, and the class is constructed with zero arguments. Every injected dependency is `undefined`; the first property access throws.

Caused by the Serverless v3→v4 migration (v3 built via tsc, v4 via esbuild). The tsconfig is fine — `tsc` does emit the metadata.

**Probe recipe** (the only way to catch this class of bug — reuse it after any DI, decorator or build change):

```bash
# bundle with the SAME esbuild Serverless uses, then run it
/home/mip/.serverless/releases/*/package/node_modules/esbuild/bin/esbuild probe.ts \
  --bundle --platform=node --target=node24 --format=cjs --outfile=/tmp/probe.js
node /tmp/probe.js   # print Reflect.getMetadata(...) and typeof each injected dep
```

**Do not "fix" this by disabling esbuild.** Tested `build: esbuild: false` on auction: it packages **14.2MB instead of 672KB** (11,850 files — all of `node_modules`, plus `iac/`, README, dotfiles) and the handler entry is **`handler.ts`, raw TypeScript Lambda cannot execute**. Making it work would need a separate tsc step, every handler repointed at `dist/`, and a `package.patterns` block — strictly worse on size and cold start. esbuild stays.

**`esbuild-plugin-tsc` is also unavailable** — it calls `ts.transpileModule`, and `typescript@7` (the Go native port, pinned per [[auctionize-dependency-ceilings]]) exposes no legacy JS API; `require("typescript").transpileModule` is `undefined`.

Three fixes, all verified by probe, ranked by effort — **user had not chosen as of 2026-08-14**:

1. **tsyringe + explicit `@inject(SomeClass)`** (~5 params, 2 files). tsyringe stores those under its own `INJECTION_TOKEN_METADATA_KEY` at decoration time, so `design:paramtypes` is never needed; esbuild preserves parameter decorators. Smallest diff but stays fragile — a future `@autoInjectable` class without `@inject` breaks silently again.
2. **Drop the container, use default-parameter injection** (~8 lines). *This matches the idiom the codebase already uses everywhere else* — `ScheduleService`, `AuthProvider` and `AuctionRepository` all default their AWS client in the constructor. All five injected classes are zero-arg constructible (`DateService` and `SecurityService` have no constructor at all), so the container was resolving things `new` already handles. Keep `reflect-metadata` for class-validator/class-transformer.
3. **Awilix** (~60 lines/service, adds a dep). The only *container* that works here.

**DI container landscape for this repo:** decorator containers that auto-read constructor types all have the identical bug — **InversifyJS and TypeDI both read `design:paramtypes`** (TypeDI is also unmaintained since ~2022). **Awilix 13.x needs zero decorators and zero metadata**; verified resolving deps and holding singletons under Serverless's esbuild, *including with `--minify`*. Use `InjectionMode.PROXY` (deps arrive as one destructured object) — PROXY survives minification, CLASSIC reads parameter names via `Function.toString()` and would not. The current build does not minify (class names are intact in the real bundle).

See [[auctionize-is-serverless-aws-no-local-stack]].
