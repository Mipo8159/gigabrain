# NestJS v1 exam fact-check (re-pinned to Nest 12)

Date: 2026-10-17. File: evals/knowledge/nestjs/exams/v1.json (20 questions).
Current major: `@nestjs/core` **12.1.3** (`latest`; 11.2.7 is `legacy`), `@nestjs/config` 12.0.1.

**Probes:** a scratch project with @nestjs/{core,common,testing,platform-express,microservices} 12.1.3,
@nestjs/config 12.0.1, TypeScript 5.9.3 (`tsc`, CommonJS output consuming ESM-only Nest via
`require(esm)`), Node 24.21.0, plus esbuild 0.25 and tsx 4.23. "[probed]" means the behaviour
was run on Nest 12.
**Docs:** github.com/nestjs/docs.nestjs.com master (the Nest 12 docs), and the installed
package source for code claims.

Counts: confirmed 14, fixed 4, rewritten-nest12 2. bin/check-exam nestjs: 0 problems.

| id | verdict | source URL(s) | note |
|---|---|---|---|
| nestjs-v1-q01 | confirmed | https://docs.nestjs.com/modules#shared-modules | [probed] `PricingService` listed in two modules plus a `@Global()` PricingModule gives 3 instances, and Cart and Orders get different ones. |
| nestjs-v1-q02 | confirmed | https://docs.nestjs.com/fundamentals/injection-scopes#scope-hierarchy ; https://docs.nestjs.com/recipes/async-local-storage | [probed] The request-scoped dep makes TaxService's constructor run once per request (2 for 2), and `onModuleInit` runs 0 times. The Nest 12 docs now recommend ALS for tenant/user data and say ALS keeps every provider a singleton. |
| nestjs-v1-q03 | confirmed | https://docs.nestjs.com/fundamentals/injection-scopes#durable-providers | Docs: one DI sub-tree per tenant, "not ideal for applications with a large number of tenants". |
| nestjs-v1-q04 | fixed | https://github.com/nestjs/nest/blob/v11.1.0/packages/core/errors/messages.ts ; https://docs.nestjs.com/fundamentals/circular-dependency | [probed] The real text is `The module at index [0] of the BillingModule "imports" array is undefined` (`"imports"` is quoted, in both 11 and 12). The stem now quotes it exactly. The design answer is unchanged. |
| nestjs-v1-q05 | rewritten-nest12 | https://docs.nestjs.com/v11/migration-guide ; https://docs.nestjs.com/fundamentals/dynamic-modules | [probed] On Nest 12, two `forRoot()` calls give 2 Store instances. The stem now says "from Nest 10 to Nest 12", and the why/explain say the Nest 11 change still holds in 12. |
| nestjs-v1-q06 | confirmed | https://docs.nestjs.com/guards ; https://docs.nestjs.com/faq/request-lifecycle | Textbook. |
| nestjs-v1-q07 | confirmed | https://docs.nestjs.com/faq/request-lifecycle | Guard before interceptor. A `false` from a guard gives 403. |
| nestjs-v1-q08 | confirmed | https://docs.nestjs.com/exception-filters | [probed] `useGlobalFilters(NotFound, All)` returns 500 `{kind:'all'}`, and the reverse order returns 404 `{kind:'nf'}`. The last registered matching filter wins on Nest 12 too. |
| nestjs-v1-q09 | fixed | https://docs.nestjs.com/faq/hybrid-application | `inheritAppConfig` is still in 12.1.3 (`nest-application.js` connectMicroservice). The current docs add that `useGlobalX()` must come **before** `connectMicroservice()`, because handlers register on that call (true in 11 too). The explain now says so. |
| nestjs-v1-q10 | confirmed | https://docs.nestjs.com/microservices/basics#sending-messages | 12.1.3 source: `send()` = `defer(...).pipe(mergeMap(new Observable(...)))` (cold). `emit()` uses `connectable(...).connect()` (hot). |
| nestjs-v1-q11 | confirmed | https://docs.nestjs.com/microservices/kafka | Docs: "For event handlers ... all unhandled exceptions are considered retriable exceptions by default". 12.1.3 `server-kafka.js` `handleEvent` awaits the handler and lets the rejection reach kafkajs. `@MessagePattern` rethrows only `KafkaRetriableException`. |
| nestjs-v1-q12 | confirmed | https://docs.nestjs.com/microservices/kafka | Transport-agnostic idempotency reasoning. |
| nestjs-v1-q13 | confirmed | https://docs.nestjs.com/microservices/redis | Docs: Pub/Sub, fire-and-forget, "no guarantee that a message ... is handled". 12.1.3 server-redis still uses `subscribe`/`psubscribe`. `retryAttempts`/`retryDelay` are reconnect options. |
| nestjs-v1-q14 | confirmed | https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown | [probed] With SIGTERM and no `enableShutdownHooks()`, no hook runs. With it: `destroy`, then `shutdown SIGTERM`. |
| nestjs-v1-q15 | rewritten-nest12 | https://docs.nestjs.com/application/configuration ; https://docs.nestjs.com/v11/migration-guide | [probed] config 12.0.1: `process.env.DB_POOL_MAX='50'`, `load: () => ({DB_POOL_MAX: 10})`, `get()` gives 10. The stem now says Nest 12 / config 12, and the explain says 4.x introduced it and 12.x keeps it. The ref moved from `/techniques/configuration` (now a redirect) to `/application/configuration`. The `expandVariables` why is still right (dotenv-expand on env values). |
| nestjs-v1-q16 | fixed | https://docs.nestjs.com/data/typeorm#async-configuration ; https://docs.nestjs.com/fundamentals/async-providers ; https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory | Facts are right: "Nest awaits resolution of the promise before instantiating any class that depends on" it. The dead anchor `techniques/configuration#async-configuration` (that section is gone in the Nest 12 docs) was replaced by `data/typeorm#async-configuration` (heading verified in content/data/typeorm.md) plus the async-providers page. |
| nestjs-v1-q17 | confirmed | https://docs.nestjs.com/fundamentals/custom-providers#class-providers-useclass | The DI docs still have the "Interfaces and abstract classes" section. Textbook. |
| nestjs-v1-q18 | confirmed | https://docs.nestjs.com/fundamentals/testing#overriding-globally-registered-enhancers | [probed] On 12.1.3, `useClass` + `overrideGuard(JwtGuard)` gives 403 and `overrideProvider(APP_GUARD)` gives 403. `useExisting` + `overrideProvider(JwtGuard)` gives 200. |
| nestjs-v1-q19 | fixed | https://docs.nestjs.com/recipes/swc | **Contradicts the earlier "confirmed"** (that check only looked at the Vite edit). [probed] On Nest 12, an esbuild bundle straight from TS boots with **no DI error**, and the injected dep is `undefined` (`Cannot read properties of undefined`). Nest reads missing `design:paramtypes` as "no params". Same with `tsx`: it boots, and `r = undefined`. So the stem's "Nest can't resolve dependencies of the OrdersService (?)" was the wrong symptom. The stem now describes the undefined dependency, and the explain says why. The key (tsc/SWC first, then bundle) is [probed]: a tsc output bundled by esbuild works, and bundling the ESM-only Nest 12 into a CJS Lambda bundle works. |
| nestjs-v1-q20 | confirmed | https://docs.nestjs.com/fundamentals/testing | Architecture item. SQLite has no `FOR UPDATE SKIP LOCKED`. |

All anchored refs in v1 were checked against the Nest 12 docs source headings: class-providers-useclass, factory-providers-usefactory, durable-providers, scope-hierarchy, application-shutdown, overriding-globally-registered-enhancers, sending-messages, shared-modules and global-scoped-pipes all exist. No `techniques/*` refs remain.

## Cross-file grep hits (not edited, not my files)

- **nestjs-v4-q18** (evals/knowledge/nestjs/exams/v4.json): `tsx watch` gives
  "Nest can't resolve dependencies of the MatchService (?, ?)". Same wrong symptom as v1-q19.
  [probed] tsx 4.23 + Nest 12.1.3 boots fine with the deps `undefined`. The symptom should be
  an undefined dependency at first use, not a DI error.
- nestjs-v2-q17 already describes it correctly ("`undefined` dependencies").
- `@nestjs/config 4` / `useGlobalFilters` order / `inheritAppConfig`: not grepped beyond
  v1. The other agents own v2-v5.

## Nest 12 deltas found (for the BRIEF)

1. **esbuild/tsx without metadata does not raise a DI error.** Nest treats missing
   `design:paramtypes` as a constructor with no params, boots, and injects `undefined`
   (probed on 12.1.3; the injector code is the same in 11). The BRIEF's fixture gotcha
   ("constructor DI by type breaks") is right, but exam stems should not show "can't resolve
   dependencies" for this cause. That error comes from metadata that *exists* with an
   `undefined` entry (interfaces, circular imports).
2. **esbuild CJS bundle of ESM-only Nest 12 works** (no top-level await; probed). An
   *unbundled* CJS Nest 12 app on Lambda Node 20/22/24 needs
   `NODE_OPTIONS=--experimental-require-module`, because Lambda disables `require(esm)` by
   default (Nest 12 migration guide).
3. **Hybrid apps:** with `inheritAppConfig`, call `useGlobal*()` before `connectMicroservice()`.
   Nest 12 also adds a `deferInitialization` hybrid option (seen in 12.1.3 `connectMicroservice`).
4. **Docs moved:** `/techniques/configuration` now redirects to `/application/configuration`,
   and its `#async-configuration` section is gone. The Nest 12 provider-scopes page now points
   tenant/user context at ALS (and `@nestjs/observe`'s store).
5. **Unchanged in 12 (probed):** dynamic-module identity by reference; config `load()`
   beating `process.env`; last-registered global filter wins; `overrideGuard` can't replace
   a `useClass` APP_GUARD; no SIGTERM hooks without `enableShutdownHooks()`; request-scoped
   providers skip `onModuleInit`; Kafka `@EventPattern` errors are retriable by default.
6. Other Nest 12 items in the migration guide that v1 doesn't touch: the Express adapter
   now drains in-flight requests on shutdown; `HttpExceptionOptions.errorCode`; opt-in
   `routeConflictPolicy`/`routeResolutionStrategy`; `ConsoleLogger` structured params on by
   default (`structuredParams: false` to revert); NATS v3 (`@nats-io/transport-node`); Terminus
   `HealthIndicator`/`HealthCheckError` removed.
