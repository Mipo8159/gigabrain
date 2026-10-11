---
name: auctionize-di-is-inversify-via-swc
description: "auctionize's DI is InversifyJS 8 resolved by type, made to work under Serverless v4 by an SWC esbuild plugin; includes the @unmanaged() rule for defaulted AWS-client constructor params."
metadata: 
  node_type: memory
  type: project
  originSessionId: cf63842b-e050-414c-9764-52b847448d16
  modified: 2026-08-15T20:09:11.329Z
---

Migrated 2026-08-15/16, replacing tsyringe (which had gone ~16 months without a release). **auction** and **auth** both use **InversifyJS 8** with type-based constructor injection and no explicit tokens; **notification** has no container because it has no services yet.

**Layout:** each service has `src/container.ts` — the composition root — which imports `reflect-metadata`, creates the `Container`, and binds every class with `.toSelf().inSingletonScope()`. Singleton scope is deliberate: a warm Lambda execution environment reuses the instances across invocations. Lambdas do `import { container } from "../container"` then `container.get(X)` at module load (was `container.resolve(X)` under tsyringe).

**This only works because of the SWC esbuild plugin** — Inversify reads `design:paramtypes` exactly like tsyringe did, so plain esbuild breaks it identically. See [[auctionize-esbuild-breaks-tsyringe-di]] for the plugin and why esbuild can never supply that metadata.

**The `@unmanaged()` rule — the one real gotcha.** Several classes default their AWS client in the constructor (`AuctionRepository` → `DynamoDBDocumentClient`, `ScheduleService` → `SchedulerClient`, `AuthProvider` → `CognitoIdentityProviderClient`). Inversify does not know a parameter has a default; it sees the type in `design:paramtypes` and tries to resolve it from the container, failing with **`Unexpected undefined service id type`**. Mark every such parameter `@unmanaged()` and the default is used as written. Verified by probe: without it both a direct `get()` and resolution through a parent fail; with it, both work. **Any new class that defaults a constructor param needs this**, or it breaks at runtime while `tsc` stays green.

Every class that participates needs `@injectable()`, including leaves with no constructor (`DateService`, `SecurityService`) — unlike tsyringe's `@autoInjectable()`, which only decorated the consumer.

**`auth/src/lambda/authorizer.ts` is deliberately NOT wrapped in middify.** A Lambda authorizer is not an HTTP endpoint: API Gateway expects it to return a policy or throw the literal string `"Unauthorized"`, which it maps to a 401. Wrapping it in `httpErrorHandler` swallowed that throw and returned `{ statusCode: 500 }`, so a bad token produced a 500 instead of a 401 — a pre-existing bug fixed during this migration. Verified the packaged bundle now throws exactly `"Unauthorized"`.
