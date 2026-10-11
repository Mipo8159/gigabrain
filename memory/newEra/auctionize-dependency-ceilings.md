---
name: auctionize-dependency-ceilings
description: Why auctionize holds @types/node at 24, why the middy/uuid "ESM ceiling" turned out to be FALSE (esbuild bundles ESM-only deps fine), and what the 2026-08-14 SDK v3 pass settled.
metadata: 
  node_type: memory
  type: project
  originSessionId: 23aacbf7-6e2d-4533-99bb-7809c633dcec
  modified: 2026-08-17T09:24:53.242Z
---

Modernised auctionize on 2026-08-13 (Serverless v3→v4, Node 18→24 runtime, TS 4.9→7.0.2) and finished it on 2026-08-14 (AWS SDK v2→v3).

**CORRECTED 2026-08-15 — the "ESM ceiling" recorded here was wrong.** I had claimed middy was capped at `^4.7.0` and uuid at `^11.1.1` because 5+/12+ are ESM-only (`type: module`, no `require` condition). That is a **runtime-resolution** wall, not a **bundling** wall. Serverless v4 bundles everything with esbuild, which inlines the ESM source, so the missing `require` condition is irrelevant. Probed directly:

- **middy `7.7.4` bundled `--format=cjs` works** and typechecks clean against the existing `middify.ts` under `module: preserve` + `moduleResolution: bundler`. The feared v5 signature rework and v6/v7 execution modes (`Standard`, `DurableContext`, `StreamifyResponse`) do **not** affect the default import — `middy().use([...]).handler(fn)` is unchanged. Zero source edits needed.
- **uuid `14.0.1` bundled `--format=cjs` works** too.

**Do not migrate to ESM to "unblock" deps — there is nothing to unblock**, and ESM does not fix the tsyringe bug either (probed: `--format=esm` gives the identical `design:paramtypes = undefined`, see [[auctionize-esbuild-breaks-tsyringe-di]]). ESM remains a cheap, independent, optional change if top-level await is ever wanted.

Only one real ceiling remains:

- **`@types/node` held at `^24`** — it tracks the `nodejs24.x` Lambda runtime, so `npm outdated` flagging 26 is noise, not a miss.

**⚠️ middy 4→7 has a BREAKING runtime change that no static check catches.** Upgraded 2026-08-15; `tsc` and `sls package` both stayed green while **4 of 8 handlers were broken**. middy 5+ made `jsonBodyParser` strict: it throws **415 Unsupported Media Type whenever `Content-Type` is not JSON**, including when there is no body and no header at all. middy 4 passed those straight through (verified side by side: same event → middy 4 returns 200, middy 7 returns 415).

That hit every non-JSON-body invocation: `getAuction`, `getAuctions` (GET, no Content-Type), `processAuction` (an EventBridge scheduled event with no headers) and **`authorizer`** — which would have broken every authenticated route in the system.

**Fix applied — body parsing is now opt-in.** `src/util/middify.ts` in all three services exports two wrappers: `middify` (httpErrorHandler only — safe default for GET routes, scheduled events, authorizers) and `middifyWithBody` (adds jsonBodyParser, used only by `createAuction`, `placeBid`, `login`, `register`). middy 7's `disableContentTypeError: true` option was rejected as the fix: it silently *skips* parsing when a POST arrives without a Content-Type, so `event.body` stays a string and `plainToInstance` produces confusing validation errors instead of a clear 415.

**`httpErrorHandler` is NOT dead weight** — an earlier note here said it was, which was wrong. `jsonBodyParser` throws its own HTTP errors, so without the handler a malformed body **throws instead of returning**, and Lambda surfaces that as a 502 rather than a clean 422. Verified both ways.

**The better move than upgrading is deleting** — 2026-08-15 audit of actual usage:

- **`uuid` is one call site**, `v4()` in `auction.service.ts`. It is installed in `auth` and `notification` where it is never imported at all. `crypto.randomUUID()` is built into `nodejs24.x`. Delete the dep from all three.
- **middy is 7 lines**, duplicated byte-identically in all three `src/util/middify.ts`. `@middy/http-event-normalizer` is commented out but still installed ×3. `httpErrorHandler` is **dead weight** — every `AuctionService`/`AuthService` method wraps itself in `try/catch` returning `presentError(500, error)`, so nothing ever escapes to middy. The only middleware doing real work is `jsonBodyParser`.
- **`class-validator` / `class-transformer` are safe** despite being decorator-based: every DTO uses explicit decorators (`@IsString()`, `@IsEnum(AuctionStatus)`), with no `@ValidateNested`/`@Type`, so none of it reads `design:paramtypes`. tsyringe is the *only* metadata casualty.

**What was actually done, re-verified 2026-08-17:** `uuid` is **gone** from all four `package.json` files. **middy was NOT deleted** — the "delete it, it's 7 lines" recommendation above was superseded once `httpErrorHandler` turned out to be load-bearing. It sits at `@middy/core` + `http-error-handler` + `http-json-body-parser` `^7.7.4` in `auction`, `auth` and `notification`, behind the `middify` / `middifyWithBody` split. Do not re-propose deleting it. `jsonwebtoken` + `jwks-rsa` are **still in `auth`** and still correct to keep: they belong to the custom `authorizer` Lambda, which only goes when `auction/` does — see [[auctionize-real-goal-is-transcoding-template]].

tsconfig uses `module: preserve` + `moduleResolution: bundler` because Serverless v4 builds with esbuild; node16-style resolution falsely rejects middy 4's CJS entry (middy ships an ESM-flavoured `.d.ts` for it) even though `require()` genuinely works. That same `bundler` resolution is what lets ESM-only majors typecheck — it reads the `import` condition, matching what esbuild does.

**General lesson worth carrying to any bundled project:** "package X went ESM-only" is only a blocker when the runtime resolves it. Under a bundler, check by building and *running* before recording a version ceiling — do not infer the ceiling from `package.json` `exports` alone. That is how a false ceiling sat in this file for a day.

**Both TS strict-flag overrides are now gone** — `strictFunctionTypes` and `strictPropertyInitialization` are back on in all three tsconfigs. Rewriting `IAuthProvider` (`auth/src/provider/auth.provider.ts`) from property-style `(params: Object) => void` to method-style signatures over real SDK v3 `*CommandInput`/`*CommandOutput` types fixed the contravariance that forced the first flag off; definite-assignment `!` on the class-validator DTO and domain properties (assigned via `plainToInstance` or setters, never in the constructor) fixed the second.

**SDK v3 migration is done**, so nothing is outstanding here. `@aws-sdk/lib-dynamodb` + `client-dynamodb` + `client-scheduler` in auction, `client-cognito-identity-provider` in auth, and `aws-sdk` dropped from notification where it was never used. Two gotchas worth remembering: v3's typed unions reject bare string literals (`ReturnValues: "ALL_NEW"` needs `ReturnValue.ALL_NEW`, `AuthFlow` needs `AuthFlowType`), and `DynamoDBDocumentClient.from()` throws on undefined attributes unless `marshallOptions.removeUndefinedValues: true` — set explicitly in `auction.adapter.ts` to keep v2's tolerance. Auction's artifact went 7.8MB → 688KB.

`serverless-iam-roles-per-function` is also gone — Serverless v4 has per-function `iamRoleStatements` built in and the plugin says so itself on every package. Verified by diffing generated CloudFormation before/after: identical except packaging timestamps. See [[auctionize-is-serverless-aws-no-local-stack]] and [[auctionize-has-its-own-claude-setup]].
