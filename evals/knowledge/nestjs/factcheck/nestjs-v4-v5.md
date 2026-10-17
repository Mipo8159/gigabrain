# NestJS fact-check: v4 + v5 (checked 2026-10-17, pinned to Nest 12)

Files: evals/knowledge/nestjs/exams/v4.json, v5.json (40 questions).
Current major: `@nestjs/core` 12.1.3 (`latest`; 11.2.7 is `legacy`), `@nestjs/config` 12.0.1,
`@nestjs/cqrs` 12.1.0, `@nestjs/bullmq` 12.0.0. Probes ran on Node 24.21 against a scratch
install of those versions (ESM scripts): Kafka handler awaiting, request-scoped lifecycle skip,
shutdown sequence, Reflector merge/override, ModuleRef get/resolve, ClassSerializerInterceptor on
plain rows, filter precedence, Fastify e2e without `ready()`, Express-style filter on Fastify.
Docs read from the docs repo source (github.com/nestjs/docs.nestjs.com `content/`). The docs were
reorganised: `techniques/*` now lives under `application/`, `data/`, `http/`; old URLs redirect
with their anchors, so old refs stay valid unless the anchor itself is gone.

bin/check-exam nestjs: 0 problems after edits.

## v4

| id | verdict | source URL(s) | note |
|---|---|---|---|
| nestjs-v4-q01 | confirmed | https://docs.nestjs.com/modules | architecture judgement; no version-specific claim |
| nestjs-v4-q02 | confirmed | https://docs.nestjs.com/fundamentals/lifecycle-events ; https://docs.nestjs.com/fundamentals/injection-scopes#scope-hierarchy ; @nestjs/core 12.1.3 hooks/utils/get-instances-grouped-by-hierarchy-level.js | v12 still skips wrappers whose dependency tree is not static (request-scoped) for every lifecycle hook; docs warning unchanged. Scope bubbling confirmed |
| nestjs-v4-q03 | fixed | https://docs.nestjs.com/data/typeorm#typeorm-transactions ; https://docs.nestjs.com/techniques/events | ref anchor `techniques/database#transactions` no longer exists (database page split; redirect map only knows `typeorm-transactions`). Content confirmed |
| nestjs-v4-q04 | confirmed | https://docs.nestjs.com/interceptors#binding-interceptors | APP_INTERCEPTOR is DI-aware; 400 x 2 = 800 maths right |
| nestjs-v4-q05 | fixed | https://docs.nestjs.com/websockets/adapter | key right, but docs warn "Redis alone is not enough" with Socket.IO polling: also need sticky sessions or `transports: ['websocket']`. Added to explain so the sticky-sessions distractor isn't read as "never needed" |
| nestjs-v4-q06 | confirmed | https://docs.nestjs.com/recipes/async-local-storage ; https://docs.nestjs.com/guards | middleware creates the ALS store first; guards run before interceptors/pipes |
| nestjs-v4-q07 | confirmed | https://docs.nestjs.com/interceptors#more-operators | RxJS timeout unsubscribes, does not cancel the promise |
| nestjs-v4-q08 | confirmed | https://docs.nestjs.com/exception-filters#binding-filters ; probe | Nest 12 probe: controller `@Catch()` + APP_FILTER global; error handled by the controller filter only (`hits: ['billing']`) |
| nestjs-v4-q09 | confirmed | https://docs.nestjs.com/techniques/queues | Node event-loop fact |
| nestjs-v4-q10 | confirmed | @nestjs/microservices 12.1.3 server/server.js `handleEvent`, server-kafka.js `getMessageHandler` ; https://docs.nestjs.com/microservices/kafka#commit-offsets | `eachMessage` awaits `handleEvent`, which awaits the handler's promise; kafkajs only auto-commits resolved offsets |
| nestjs-v4-q11 | fixed | https://docs.nestjs.com/microservices/basics#handling-timeouts ; @nestjs/microservices 12.1.3 client/client-tcp.js | ref anchor renamed (`#timeouts` -> `#handling-timeouts`). Claim "no default timeout" confirmed: ClientTCP has only framing `incompleteMessageTimeout`, no request timeout |
| nestjs-v4-q12 | confirmed | https://docs.nestjs.com/recipes/cqrs | consistency design; no version claim |
| nestjs-v4-q13 | confirmed | https://docs.nestjs.com/microservices/kafka | Kafka textbook (per-partition order, transactions don't span Postgres) |
| nestjs-v4-q14 | fixed | https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown ; @nestjs/bullmq 12.0.0 dist/bull.explorer.js | `@nestjs/bullmq` already calls `worker.close()` in `onApplicationShutdown`, so with `enableShutdownHooks()` on, the keyed fix would already be in place. Stem now says the Worker is built by hand; explain notes what the package does |
| nestjs-v4-q15 | confirmed | https://docs.nestjs.com/techniques/configuration#configuration-namespaces ; @nestjs/config 12.0.1 typings | `registerAs`, `ConfigType`, `getOrThrow`, `{ infer: true }` all still exported in v12 |
| nestjs-v4-q16 | fixed | https://docs.nestjs.com/data/typeorm#async-configuration ; pg 8.23.1 lib/client.js `_getPassword` | ref `techniques/configuration#async-configuration` has no such section (async config is on the TypeORM page). Key confirmed: pg calls `password` per connection when it is a (sync or async) function |
| nestjs-v4-q17 | confirmed | https://docs.nestjs.com/fundamentals/testing#testing-utilities | override the injected token, not the `useClass` class |
| nestjs-v4-q18 | fixed | https://docs.nestjs.com/recipes/swc ; probe (esbuild 0.25 + Nest 12.1.3) | esbuild drops `design:paramtypes`; Nest 12 then boots and injects `undefined` (probe: both deps `undefined`, no startup error). Stem claimed "can't resolve dependencies (?, ?)", which only appears when another param has an explicit `@Inject()`. Stem now shows the runtime TypeError; explain says why. Key unchanged |
| nestjs-v4-q19 | confirmed | https://docs.nestjs.com/fundamentals/testing#end-to-end-testing ; probe | Nest 12 probe: FastifyAdapter `init()` does not call `ready()`; supertest request without it throws inside Fastify hooks and never answers (node:test hung past its 4 s timeout); with `ready()` or `app.inject()` it returns 200 |
| nestjs-v4-q20 | confirmed | https://docs.nestjs.com/fundamentals/testing#auto-mocking ; @nestjs/testing 12.1.3 typings | `useMocker()` present |

## v5

| id | verdict | source URL(s) | note |
|---|---|---|---|
| nestjs-v5-q01 | confirmed | https://docs.nestjs.com/modules | exports govern DI only; lint for source boundaries |
| nestjs-v5-q02 | confirmed | https://docs.nestjs.com/fundamentals/injection-scopes ; https://docs.nestjs.com/recipes/async-local-storage | singleton state race; transient is per consumer |
| nestjs-v5-q03 | confirmed | https://docs.nestjs.com/fundamentals/dynamic-modules#community-guidelines ; @nestjs/common 12.1.3 nest-application-context-options.interface.d.ts | `moduleIdGeneratorAlgorithm` default `'reference'`, so each `register()` call is a new module and rebuilds its clients |
| nestjs-v5-q04 | confirmed | https://docs.nestjs.com/faq/hybrid-application ; https://docs.nestjs.com/cli/monorepo | hybrid = one process (`connectMicroservice`) |
| nestjs-v5-q05 | confirmed | https://docs.nestjs.com/fundamentals/module-ref#resolving-scoped-providers ; probe | Nest 12 probe: `get()` on request-scoped throws `InvalidClassScopeException`; two `resolve()` without context ID differ; with one shared `ContextIdFactory.create()` they are equal |
| nestjs-v5-q06 | confirmed | https://docs.nestjs.com/pipes#built-in-pipes | ParseUUIDPipe 400 default |
| nestjs-v5-q07 | fixed | https://docs.nestjs.com/techniques/serialization (#transform-plain-objects) ; probe | Nest 12 probe on a plain row: default leaks `email`; `strategy: 'excludeAll'` returns `{}` (not "still leaks"); `type: UserEntity` strips `email`. Rewrote that distractor's why; explain now names `@SerializeOptions({ type })`. Key unchanged |
| nestjs-v5-q08 | confirmed | https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata ; @nestjs/core 12.1.3 services/reflector.service.js | `getAllAndMerge` on two booleans returns `[a, b]`; `getAllAndOverride` returns first defined |
| nestjs-v5-q09 | fixed | https://docs.nestjs.com/exception-filters#catch-everything ; https://docs.nestjs.com/techniques/performance ; probe | Nest 12 probe: Fastify reply has `.status()`, so `.json` throws and Fastify sends its own error JSON with the set status, not "a bare 500 with no body". Stem reworded. `httpAdapter.reply()` probe returns the custom body. Middleware gets raw req/res (performance page) |
| nestjs-v5-q10 | confirmed | https://docs.nestjs.com/microservices/kafka (#custom-exception-handling) | docs' own retry example republishes with a retry-count header, consistent with non-blocking retry topics |
| nestjs-v5-q11 | confirmed | https://docs.nestjs.com/faq/hybrid-application ; https://docs.nestjs.com/microservices/kafka | Nest 12 Kafka transport still kafkajs, so `maxBytes` is a real consumer option |
| nestjs-v5-q12 | confirmed | https://docs.nestjs.com/recipes/cqrs#events ; @nestjs/cqrs 12.1.0 dist/mixins/with-aggregate-root.mixin.js | `commit()` publishes then clears; `uncommit()` only clears |
| nestjs-v5-q13 | confirmed | https://docs.nestjs.com/microservices/kafka (#context) ; https://docs.nestjs.com/recipes/async-local-storage | headers readable via `KafkaContext.getMessage().headers`; interceptors apply to microservice handlers |
| nestjs-v5-q14 | confirmed | https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown ; @nestjs/core 12.1.3 nest-application-context.js `runShutdownSequence` | v12 order: prepareClose (marks shutting down; only 503s new requests if `return503OnClosing`) -> onModuleDestroy -> beforeApplicationShutdown -> dispose (server close, Express now drains in-flight) -> onApplicationShutdown. Default still accepts requests until dispose, so the distractor's why holds |
| nestjs-v5-q15 | confirmed | https://docs.nestjs.com/techniques/configuration | `ignoreEnvFile` still in @nestjs/config 12.0.1 options |
| nestjs-v5-q16 | confirmed | https://docs.nestjs.com/techniques/logger (#json-logging) | already confirmed 2026-10-16; re-checked for v12: `ConsoleLogger` `json` and `bufferLogs` still present. v12 structured params don't affect the answer |
| nestjs-v5-q17 | fixed | https://docs.nestjs.com/microservices/basics#client-producer-class ; https://docs.nestjs.com/fundamentals/testing | ref anchor renamed (`#client` -> `#client-producer-class`). Content confirmed |
| nestjs-v5-q18 | confirmed | https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown | docs: hooks run on explicit `app.close()`; signals need `enableShutdownHooks()` |
| nestjs-v5-q19 | confirmed | https://docs.nestjs.com/techniques/database | hexagonal mapping; no version claim |
| nestjs-v5-q20 | confirmed | https://docs.nestjs.com/recipes/swc#common-pitfalls | docs show `WrapperType<T>` with `@Inject(forwardRef(...))` for circular DI under SWC |

## Nest 12 deltas found

None of the 40 keyed answers changes between Nest 11 and 12, so no stem needed a "Nest 12" pin.
What v12 changes around these questions:
- **Docs layout:** `techniques/*` moved to `application/`, `data/`, `http/`. Old URLs redirect and keep anchors,
  but some anchors are gone: `techniques/database#transactions` (now `data/typeorm#typeorm-transactions`),
  `microservices/basics#timeouts` (now `#handling-timeouts`), `microservices/basics#client` (now
  `#client-producer-class`). `techniques/configuration#async-configuration` never matched a section.
- **Shutdown:** a `prepareClose()` step runs before `onModuleDestroy` (adapter `beforeClose()`, which 503s new
  requests only with `return503OnClosing`). The Express adapter now drains in-flight requests. Hook phases are
  unchanged; ordering *within* a phase is now by hierarchy level.
- **WebSockets:** gateways can now be request-scoped (v4-q05's request-scoped distractor stays wrong: per-request
  state doesn't cross pods).
- **ConsoleLogger:** structured params on by default (`structuredParams`), JSON mode unchanged.
- **Packages are ESM-only:** probes had to run as ESM; `ClassSerializerInterceptor` loads class-transformer with
  a lazy `import()` on first `intercept()`.
- **Kafka transport:** still kafkajs; `@EventPattern` now accepts a RegExp.

## Cross-file hits (not edited, other owners)

- evals/knowledge/nestjs/exams/v1.json:542 — ref `techniques/configuration#async-configuration` (no such section; use `data/typeorm#async-configuration`).
- evals/knowledge/nestjs/exams/v2.json:633 — ref `techniques/database#transactions` (dead anchor; use `data/typeorm#typeorm-transactions`).
- evals/knowledge/nestjs/BRIEF.md:359 — same `techniques/database#transactions` link.

## Not verified

Nothing left unverified.
