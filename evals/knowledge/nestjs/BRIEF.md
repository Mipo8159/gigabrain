# NestJS knowledge brief (slug: nestjs)

Researched 2026-10-12. The domain is **Nest 11**, but **Nest 12 is now `latest`**
(12.0.0 shipped 2026-08-27; 12.1.3 shipped today). Nest 11 still gets fixes under the
`legacy` dist-tag (11.2.7, 2026-09-30). The fixtures should pin 11.2.7 (see
"Versions checked"). Nest 12 deltas are listed at the end of the traps.

The behaviour claims marked **[probed]** were run against a scratch Nest 11.2.7 +
Express 5.2.1 + Fastify 5.11.3 project on Node 24.21. Everything else is from the
cited docs only.

## Mental model

1. A Nest app is a tree of **modules**. Each module lists its `providers` (things
   to build), its `controllers` (HTTP entry points), its `imports` (other modules)
   and its `exports` (the subset of its providers that importers may use).
2. The **DI container** builds each provider once per module scope by reading the
   constructor parameter types. It reads them from TypeScript's
   `emitDecoratorMetadata`, so a build tool that drops that metadata breaks DI.
3. Providers are **singletons** by default. A `REQUEST`-scoped provider is
   rebuilt for every request, and so is everything that depends on it.
4. A request passes through **middleware → guards → interceptors (before) →
   pipes → handler → interceptors (after)**. If anything throws, the **exception
   filters** handle it.
5. Guards answer "may this request run?". Pipes validate and convert arguments.
   Interceptors wrap the handler as an RxJS stream. Filters turn errors into
   responses.
6. Each kind of enhancer can be bound **globally**, per controller or per
   method. A global binding made with `app.useGlobalX()` in `main.ts` lives
   outside the module tree. One made with the `APP_X` provider tokens lives
   inside it.
7. The HTTP layer is an **adapter**: Express 5 by default, or Fastify 5. Code
   that touches the raw `req`/`res` is adapter-specific.
8. **Lifecycle hooks** run on startup (`onModuleInit`, then
   `onApplicationBootstrap`) and on shutdown (`onModuleDestroy`, then
   `beforeApplicationShutdown`, then `onApplicationShutdown`). The shutdown hooks
   run on OS signals only after `enableShutdownHooks()`.
9. `Test.createTestingModule()` builds the same container from the modules you
   give it, without running `main.ts`. You can swap providers before
   `.compile()`.
10. The microservices package reuses the same controllers and DI over other
    transports (TCP, Kafka, NATS and others). `send()` is request-reply and
    `emit()` is fire-and-forget.

## Traps

### 1. Global `ValidationPipe` set in `main.ts` is missing in tests and e2e
- **Mistake:** Calling `app.useGlobalPipes(new ValidationPipe(...))` (or
  `useGlobalGuards`, `useGlobalFilters`, `useGlobalInterceptors`) only in
  `main.ts`. The app validates in production, but any app built from `AppModule`
  by `Test.createTestingModule` skips validation. So does a hybrid or
  microservice bootstrap.
- **Correct:** Register the pipe inside the module tree:
  `{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) }`
  (or `useClass`). Use `APP_GUARD`, `APP_FILTER` and `APP_INTERCEPTOR` from
  `@nestjs/core` for the others. A provider-registered enhancer can also use DI.
- **Source:** https://docs.nestjs.com/pipes#global-scoped-pipes ,
  https://docs.nestjs.com/guards#binding-guards
- **Testable how:** The hidden test runs
  `Test.createTestingModule({ imports: [AppModule] })`, then
  `createNestApplication()` and `init()`, without touching `main.ts`. It then
  POSTs an invalid body and asserts 400. With the mistake the response is 201.
- **LLM likelihood:** **high.** Almost every tutorial and generated `main.ts`
  uses `useGlobalPipes`, and the model writes the test against `AppModule`.

### 2. Express 5's default query parser is `simple`, so nested query objects vanish
- **Mistake:** Expecting `?filter[status]=open` to arrive as
  `{ filter: { status: 'open' } }` in `@Query()` or in a query DTO with
  `@ValidateNested`. That was the Express 4 behaviour, which used `qs`.
- **Correct:** Nest 11 uses Express 5, whose default query parser is `simple`.
  **[probed]** The request above yields `{ "filter[status]": "open" }`. Repeated
  keys still become arrays (`ids=1&ids=2` gives `["1","2"]`). To restore nesting,
  create the app with `NestFactory.create<NestExpressApplication>(...)` and call
  `app.set('query parser', 'extended')`. In a test, call it on the
  `createNestApplication<NestExpressApplication>()` result.
- **Source:** https://docs.nestjs.com/v11/migration-guide (section "Query
  parameters parsing")
- **Testable how:** The fixture has a `GET /items?filter[status]=open`
  endpoint that filters by status. The hidden test asserts that only open items
  come back. With the mistake the filter is ignored, or validation fails with
  400.
- **LLM likelihood:** **high.** Training data is mostly Express 4 and Nest ≤10.

### 3. `enableImplicitConversion` turns the string `"false"` into `true`
- **Mistake:** Writing
  `new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } })`
  to make query DTO booleans and numbers "just work", with
  `@IsBoolean() active: boolean`. Or the opposite mistake: using
  `transform: true` alone and expecting `@IsInt() page: number` in a `@Query()`
  DTO to pass.
- **Correct:** **[probed]** With implicit conversion, `?flag=false` arrives as
  `flag: true`, because `Boolean("false")` is true. It passes `@IsBoolean()`.
  Without implicit conversion, `?page=2` stays the string `"2"` and `@IsInt()`
  returns 400.
  - **Numbers:** add `@Type(() => Number)` to the field.
  - **Booleans:** add an explicit `@Transform(({ obj, key }) => obj[key] === 'true')`.
    Read the raw value from `obj[key]`; `value` may already be converted.
  - **Single params:** a primitive `@Param('id') id: number` *is* converted when
    `transform: true` is set, even without implicit conversion **[probed]**.
    You can also use `ParseIntPipe` or `ParseBoolPipe`.
- **Source:** https://docs.nestjs.com/techniques/validation#transform-payload-objects ,
  https://github.com/typestack/class-transformer/issues/550
- **Testable how:** The fixture is `GET /users?active=false`. The hidden test
  asserts that only inactive users come back. The second case is
  `GET /users?page=2` with `@IsInt()`, asserted to return 200.
- **LLM likelihood:** **high.** The implicit-conversion flag is the usual
  "fix", and the boolean bug is silent.

### 4. Nested and array bodies are not validated without `@Type` / `ParseArrayPipe`
- **Mistake:** Putting `@ValidateNested() address: AddressDto` on a field
  without `@Type(() => AddressDto)`, or declaring a top-level
  `@Body() items: CreateItemDto[]`.
- **Correct:** **[probed]** Without `@Type`, the nested plain object is never
  turned into the DTO class, so its rules never run. `{ inner: { name: 5 } }`
  returns 201. (A non-object value still fails with 400.) Add
  `@Type(() => AddressDto)`. For arrays, use `@ValidateNested({ each: true })`
  plus `@Type`. For a top-level array body, TypeScript erases the element type,
  so `@Body() items: Dto[]` returns 201 on bad items **[probed]**. Use
  `@Body(new ParseArrayPipe({ items: Dto }))`, which returns 400 **[probed]**.
- **Source:** https://docs.nestjs.com/techniques/validation#parsing-and-validating-arrays ,
  https://github.com/typestack/class-validator#validating-nested-objects
- **Testable how:** The hidden test POSTs a nested object with a wrong type and
  expects 400. It then POSTs an array body with one bad item and expects 400.
- **LLM likelihood:** **high** for the top-level array. **Medium** for the
  missing `@Type`.

### 5. `whitelist: true` silently strips fields; it does not reject them
- **Mistake:** Assuming `whitelist: true` blocks mass assignment by returning
  400. Or forgetting that an undecorated DTO property counts as "not whitelisted"
  and is stripped.
- **Correct:** `whitelist` removes unknown properties and the request succeeds.
  **[probed]** `{name:'a', admin:true}` becomes `{name:'a'}` with 201. Add
  `forbidNonWhitelisted: true` to get a 400. Every allowed property needs at
  least one class-validator decorator. Use `@IsOptional()` or `@Allow()` when no
  other rule fits.
- **Source:** https://docs.nestjs.com/techniques/validation#stripping-properties
- **Testable how:** The spec says "unknown fields → 400". The hidden test sends
  an extra field and expects 400. A second case sends an optional field that has
  no decorator and expects it to be persisted.
- **LLM likelihood:** **medium.**

### 6. Request scope bubbles up the injection chain, and scoped providers can't be fetched with `get()`
- **Mistake:** Injecting a `Scope.REQUEST` provider (or `@Inject(REQUEST)`)
  into a "singleton" service, then:
  - expecting that service's constructor to run once;
  - expecting its `onModuleInit` to fire;
  - fetching it in a test with `module.get(Service)`.
- **Correct:** **[probed]**
  - **Bubbling:** the consumer and the controller become request-scoped. The
    constructor ran 2 times for 2 requests.
  - **Lifecycle hooks:** `onModuleInit` is **not** called on request-scoped
    instances.
  - **Lookup:** `module.get()` throws "is marked as a scoped provider... can't
    be used in combination with get()". Use `await module.resolve(Service)`, or
    `resolve(Service, contextId)` with
    `ContextIdFactory.getByRequest(req)`.

  To avoid all this, pass request data as method arguments, or use
  `durable: true` with a `ContextIdStrategy` for tenant scoping.
- **Source:** https://docs.nestjs.com/fundamentals/injection-scopes#scope-hierarchy ,
  https://docs.nestjs.com/fundamentals/module-ref#resolving-scoped-providers
- **Testable how:** The fixture has an expensive cache warmed in `onModuleInit`
  and a `RequestContext` service. The hidden test asserts that the cache is warm
  after two requests and that the constructor ran exactly once. A unit test
  `module.get()`s the service.
- **LLM likelihood:** **medium-high.** Models know request scope exists, but
  rarely the bubbling and hook consequences.

### 7. `overrideGuard()` does not replace a guard registered as `APP_GUARD` with `useClass`
- **Mistake:** Registering `{ provide: APP_GUARD, useClass: JwtGuard }` and
  writing `Test.createTestingModule({ imports: [AppModule] }).overrideGuard(JwtGuard).useValue({ canActivate: () => true })`.
- **Correct:** **[probed]** Both `overrideGuard(JwtGuard)` and
  `overrideProvider(APP_GUARD)` leave the real guard in place, and the response
  is still 403. Register it as
  `{ provide: APP_GUARD, useExisting: JwtGuard }, JwtGuard`. Then
  `overrideProvider(JwtGuard).useValue(...)` works, giving 200 **[probed]**.
- **Source:** https://docs.nestjs.com/fundamentals/testing#overriding-globally-registered-enhancers
- **Testable how:** The task is "write an e2e test that bypasses auth". The
  hidden check runs the candidate's test file against the provided `AppModule`
  and requires that it passes. Or the hidden test itself uses
  `overrideProvider(JwtGuard)` and requires the candidate's module wiring to use
  `useExisting`.
- **LLM likelihood:** **high.** `overrideGuard` is the obvious API, and it
  fails silently.

### 8. Nest 11: identical dynamic modules imported twice are now two separate instances
- **Mistake:** Calling `StoreModule.forRoot()` in two feature modules and
  assuming they share one `Store` instance. That was true in Nest ≤10, which
  deduplicated modules by a hash of their metadata.
- **Correct:** Nest 11 identifies dynamic modules by **object reference**.
  **[probed]** Two `forRoot()` calls produce two `Store` instances. Build the
  dynamic module once (`export const StoreRoot = StoreModule.forRoot()`) and
  import that constant, or make it `global`. In tests you can use
  `module.get(X, { each: true })`, or the legacy option
  `Test.createTestingModule({...}, { moduleIdGeneratorAlgorithm: 'deep-hash' })`.
- **Source:** https://docs.nestjs.com/v11/migration-guide (section "Module
  resolution algorithm")
- **Testable how:** Module A writes to an in-memory store and module B reads
  from it, both through `forRoot()`. The hidden test expects B to see A's write.
- **LLM likelihood:** **high.** This is a recent, silent behaviour change.

### 9. Nest 11: shutdown hooks run in reverse dependency order
- **Mistake:** Assuming `onModuleDestroy` runs in the same order as
  `onModuleInit`. The bug pattern is a DB module closing its connection while a
  service that depends on it still flushes in its own `onModuleDestroy`. Or the
  author writes defensive code that assumes the old order.
- **Correct:** **[probed]** `init C, init A, destroy A, destroy C`. The
  dependency is initialised first and destroyed last. Global modules are
  initialised first and destroyed last.
  - **Nest 12** goes further and orders by *component hierarchy level*.
- **Source:** https://docs.nestjs.com/v11/migration-guide (section "Termination
  lifecycle hooks order") , https://docs.nestjs.com/migration-guide
- **Testable how:** A `QueueService` flushes to a `DbService` in
  `onModuleDestroy`. The hidden test calls `app.close()` and asserts that the
  flushed rows exist. It also records the order of hook calls.
- **LLM likelihood:** **medium.**

### 10. Shutdown hooks don't run on SIGTERM without `enableShutdownHooks()`
- **Mistake:** Implementing `OnApplicationShutdown` and
  `BeforeApplicationShutdown` for graceful shutdown in Docker or Kubernetes, but
  never calling `app.enableShutdownHooks()`.
- **Correct:** **[probed]** If you send SIGTERM to a `NestFactory.create` app
  without that call, no hook runs. With it, `onApplicationShutdown('SIGTERM')`
  runs. `app.close()` calls the hooks either way, so a test that only calls
  `close()` gives false confidence.
- **Source:** https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown
- **Testable how:** A `node --test` case spawns the compiled `main.js` with
  `child_process.spawn`, waits for a "ready" line, and sends `SIGTERM`. It then
  asserts that the hook's side effect happened, such as a marker line or a file.
- **LLM likelihood:** **medium.** It is often forgotten when `main.ts` is
  generated.

### 11. `@nestjs/config` v4: `ConfigService.get` prefers `load()` values over `process.env`
- **Mistake:** Defining defaults in a `load: [() => ({ PORT: 3000, ... })]`
  factory with the same keys as the env vars, and expecting `PORT=8080` in the
  environment to win. That was the v3 behaviour.
- **Correct:** **[probed]** With config 4.x the lookup order is: (1) internal
  config (namespaces and `load` files), (2) validated env, if there is a schema,
  (3) `process.env`. With `FOO=from-env`, `get('FOO')` returns `'from-load'`. Read
  `process.env.X ?? default` inside the factory, or use distinct keys or
  namespaces (`registerAs`).
  - `ignoreEnvVars` is deprecated in favour of `validatePredefined: false`.
  - `skipProcessEnv` is a new option.
- **Source:** https://docs.nestjs.com/v11/migration-guide (section
  "ConfigModule") , https://github.com/nestjs/config/releases/tag/4.0.0
- **Testable how:** The hidden test sets `process.env.FEATURE_X='on'` before
  compiling and asserts that the endpoint reports the feature as on.
- **LLM likelihood:** **high.** This is recent, silent, and the opposite of
  common advice.

### 12. Execution order and which exception filter wins
- **Mistake:** These are three related mistakes:
  - putting auth in an interceptor (which runs after guards) or in a pipe;
  - expecting an interceptor's `catchError` to see a guard's rejection;
  - registering a catch-all filter plus a specific filter globally and
    expecting "the most specific" one to handle an error.
- **Correct:** **[probed]** The order is
  `middleware > guard > interceptor-before > pipe > handler > interceptor-after`.
  A guard that throws means no interceptor runs.
  - **Filter scope:** filters are resolved from the narrowest scope outward
    (method, then controller, then global), and only **one** filter handles each
    error.
  - **Several global filters:** among filters passed to `useGlobalFilters(A, B)`,
    the **last registered matching** filter wins, not the most specific one.
    **[probed]** `(CatchAll, HttpOnly)` let `HttpOnly` handle the error, while
    `(HttpOnly, CatchAll)` let `CatchAll` handle it.
- **Source:** https://docs.nestjs.com/faq/request-lifecycle ,
  https://docs.nestjs.com/exception-filters#catch-everything (the filter
  ordering among globals is from the probe, not the docs)
- **Testable how:** The fixture records stage names into an array and the hidden
  test asserts the order. A second test throws `NotFoundException` with two
  global filters registered and asserts the custom 404 body.
- **LLM likelihood:** **medium.** The order list is well known. The tie-break
  between global filters is not.

### 13. Injecting `@Res()` switches off Nest's response handling, so the request hangs
- **Mistake:** Writing
  `@Get() find(@Res() res: Response) { res.setHeader('X-Total', n); return items; }`
  to set a header and still return a value.
- **Correct:** **[probed]** With plain `@Res()` the returned value is ignored and
  the request never completes (supertest times out). Use
  `@Res({ passthrough: true })`, or better, `@Header()` or an interceptor. Using
  `@Res()` also bypasses interceptors that map the response body.
- **Source:** https://docs.nestjs.com/controllers#library-specific-approach
- **Testable how:** The hidden test calls
  `request(server).get('/items').timeout(1000)` and asserts the status, the
  header and the body.
- **LLM likelihood:** **medium.**

### 14. Fastify adapter differences: `ready()`, the reply API, and raw middleware objects
- **Mistake:** Copying Express code onto `FastifyAdapter`. There are three ways
  this goes wrong:
  - `res.status(201).json(...)` in handlers or filters;
  - `res.json` in middleware;
  - in tests, running supertest right after `app.init()`.
- **Correct:** **[probed]** Three findings:
  - **Supertest:** a Fastify app needs
    `await app.getHttpAdapter().getInstance().ready()` after `init()`, or
    supertest hangs or crashes. Alternatively use
    `app.inject({ method, url })`.
  - **Reply API:** `res.status(...).json` throws "is not a function". Use
    `reply.code(201).send(...)`. In filters, use
    `host.switchToHttp().getResponse<FastifyReply>()` with `.code().send()`, or
    the adapter-neutral `httpAdapter.reply(res, body, status)` via
    `HttpAdapterHost`.
  - **Middleware:** middleware receives the raw Node `IncomingMessage` and
    `ServerResponse`, so there is no `res.json`.

  Fastify 5 CORS allows only safelisted methods unless they are listed. Fastify
  middleware paths no longer accept `(.*)`; use `'*splat'`.
- **Source:** https://docs.nestjs.com/techniques/performance ,
  https://docs.nestjs.com/fundamentals/testing#end-to-end-testing (Fastify
  note) , https://docs.nestjs.com/v11/migration-guide (section "Fastify v5")
- **Testable how:** The fixture is a Fastify app with a custom
  `HttpExceptionFilter` and a `POST` returning 201. The hidden test uses
  supertest (after `ready()`) and asserts the filter's JSON body. An
  Express-style filter throws inside the filter and returns 500.
- **LLM likelihood:** **high.** Models default to Express idioms.

### 15. Microservices: `ClientProxy.send()` is cold, and Kafka request-reply needs `subscribeToResponseOf`
- **Mistake:** Calling `this.client.send('orders.create', dto)` without
  subscribing, which means without `firstValueFrom` or `await lastValueFrom`.
  Or calling Kafka `send()` without
  `client.subscribeToResponseOf('orders.create')` before `connect()`. Or
  throwing a plain `Error` in a Kafka `@EventPattern` handler.
- **Correct:**
  - **`send()`:** **[probed]** (TCP transport) `send()` without a subscriber
    delivers nothing; the handler call count stays at 0. `emit()` is hot and
    delivers immediately. Use `await firstValueFrom(client.send(...))`.
  - **Kafka request-reply:** call `subscribeToResponseOf(pattern)` in
    `onModuleInit` before `await client.connect()`. The reply topic is
    `<topic>.reply`, and each running app needs at least one reply partition.
  - **Kafka errors:** in `@EventPattern` handlers *all* unhandled errors are
    retriable by default, so a poison message can loop.
    `@MessagePattern` handlers retry only on `KafkaRetriableException`.
  - **Nest 12:** Kafka patterns may be a `RegExp`.
- **Source:** https://docs.nestjs.com/microservices/basics#sending-messages ,
  https://docs.nestjs.com/microservices/kafka
- **Testable how:** Use TCP so that no broker is needed. A hybrid app exposes
  `POST /orders`, which should forward to a `@MessagePattern` handler. The hidden
  test asserts that the handler ran and that the HTTP response contains the
  reply. Kafka itself is only practical as a static check, for example that
  `subscribeToResponseOf` appears before `connect`, unless the harness runs
  Redpanda.
- **LLM likelihood:** **medium.** The cold `send()` is a classic. The Kafka
  retry default is obscure.

### 16. Transactions: the injected repository or Prisma client is outside the transaction
- **Mistake:** Inside
  `this.dataSource.transaction(async (manager) => { ... })` the code calls
  `this.usersRepo.save(...)` (the injected `@InjectRepository` repo) instead of
  `manager.getRepository(User).save(...)` or `manager.save(...)`. The Prisma
  equivalent is calling `this.prisma.user.update` inside
  `this.prisma.$transaction(async (tx) => ...)` instead of `tx.user.update`.
- **Correct:** Only operations that go through the transactional `manager`
  (TypeORM) or `tx` (Prisma interactive transaction) are rolled back. Pass the
  manager down, use a `QueryRunner`, or use a CLS-based helper such as
  `@nestjs-cls/transactional`.
- **Source:** https://docs.nestjs.com/techniques/database#transactions ,
  https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions
- **Testable how:** Use TypeORM with `sql.js` (no native build) or
  better-sqlite3. A `transfer()` debits A, credits B, then throws on purpose.
  The hidden test asserts that A's balance is unchanged after the error.
- **LLM likelihood:** **medium-high.** It works in the happy path and only
  breaks on rollback.

### Lower-yield, but worth a negative control or a bonus item
- **Express 5 unnamed wildcards.**
  - **What happens:** **[probed]** In Nest 11, `@Get('files/*')` and
    `forRoutes('*')` still *work*, through `LegacyRouteConverter`, but log
    `WARN ... Unsupported route path`.
  - **Correct form:** `'files/*splat'`, or `'{*splat}'` to also match the root.
    Optional segments use braces (`/:file{.:ext}`), and regex characters are
    not supported.
  - **For a test:** only a log-capture test catches the old form, so it is a
    weak trap.
- **Circular dependencies.**
  - **Modules:** **[probed]** modules that import each other without
    `forwardRef(() => OtherModule)` on **both** sides fail with "The module at
    index [0] of the MB imports array is undefined".
  - **Providers:** in the same module, `@Inject(forwardRef(() => B))` works,
    and the instance was defined even in the constructor in the probe.
  - **Takeaway:** models usually get this right.
- **Exporting vs re-providing.** Listing `CounterService` in the `providers` of
  two modules creates two instances. The fix is to export it from one module and
  import that module.
- **Nest 12 deltas** (if the fixture is ever bumped):
  - **Packages:** all `@nestjs/*` packages are ESM-only. Running them under
    Jest needs Node ≥ 24.9, otherwise you get `ERR_REQUIRE_ASYNC_MODULE`.
  - **`@Optional()`:** no longer inherited. A subclass without its own
    constructor throws `UnknownDependenciesException`.
  - **`validationSchema`:** takes any Standard Schema. Joi must be v18+, and
    Joi options move to `validationOptions.libraryOptions`.
  - **Body schemas:** `@Body({ schema })` with `StandardSchemaValidationPipe`.
  - **`ValidationPipe`:** new `errorFormat` option.
  - **Logging:** `ConsoleLogger` puts object params on the same entry.
  - **Lifecycle:** ordering is by hierarchy level.

  Source: https://docs.nestjs.com/migration-guide ,
  https://github.com/nestjs/nest/releases/tag/v12.0.0

## Versions checked

Checked against the npm registry and https://github.com/nestjs/nest/releases on 2026-10-12:

| Package | latest | Nest 11 line used for fixtures |
|---|---|---|
| @nestjs/core / common / testing / platform-* / microservices | 12.1.3 (12.0.0 on 2026-08-27) | **11.2.7** (dist-tag `legacy`, 2026-09-30) |
| @nestjs/config | 12.0.1 | **4.0.4** |
| @nestjs/typeorm | 12.0.2 | **11.0.3** (peer `typeorm ^0.3.0 \|\| ^1.0.0-dev`) |
| typeorm | 1.1.2 (1.0.0 on 2026-05-19) | 0.3.29 recommended (the 1.x line has not been probed here) |
| express (via platform-express 11.2.7) | 5.3.0 | 5.2.1 |
| fastify (via platform-fastify 11.2.7) | n/a | 5.11.3 |
| class-validator / class-transformer | 0.15.1 / 0.5.1 | same |
| reflect-metadata / rxjs | 0.2.2 / 7.8.2 | same |
| typescript | n/a | 5.9.3 (Nest 12's `nest upgrade` moves to TS 6) |
| Node | n/a | Nest 11 needs ≥ 20; Nest 12 needs 20.19+ / 22.12+. The probes ran on 24.21 |

Minimal fixture `package.json`:

```json
{
  "private": true,
  "scripts": { "build": "tsc -p .", "test": "tsc -p . && node --test \"dist/**/*.test.js\"" },
  "dependencies": {
    "@nestjs/common": "11.2.7",
    "@nestjs/core": "11.2.7",
    "@nestjs/platform-express": "11.2.7",
    "@nestjs/config": "4.0.4",
    "class-validator": "0.15.1",
    "class-transformer": "0.5.1",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.2"
  },
  "devDependencies": {
    "@nestjs/testing": "11.2.7",
    "supertest": "7.3.1",
    "@types/supertest": "7.2.1",
    "@types/node": "26.6.5",
    "typescript": "5.9.3"
  }
}
```

Add these only for the traps that need them:
- `@nestjs/platform-fastify@11.2.7` for trap 14;
- `@nestjs/microservices@11.2.7` for trap 15 (TCP needs nothing else; Kafka
  needs `kafkajs@2.2.4`);
- `@nestjs/typeorm@11.0.3` + `typeorm@0.3.29` + `sql.js` for trap 16.

Fixture gotchas found while probing:
- **Compiler:** use `tsc` with `"experimentalDecorators": true` and
  `"emitDecoratorMetadata": true` (`module: commonjs`). Do not use
  `tsx`/esbuild, which drops decorator metadata, so constructor DI by type
  breaks.
- **Test runner:** on Node 24, `node --test dist/` (a directory) fails with
  MODULE_NOT_FOUND. Pass a glob such as `"dist/**/*.test.js"`.
- **Cleanup:** always `await app.close()` in tests, or `node --test` keeps the
  process alive.
