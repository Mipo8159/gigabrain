---
timeout: 900
deps: nestjs
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-131: API-key auth for the whole API.

NestJS 11 service in `src/`. Everything is unauthenticated right now. Please add API-key auth:

- Every route requires the header `x-api-key` equal to the `API_KEY` setting (read it through `ConfigService`; `ConfigModule` is already global). Missing or wrong key: 401.
- Routes marked with a `@Public()` decorator skip the check. `GET /health` must be public.
- Apply it app-wide so a new controller can't forget it.
- Put the guard in `src/auth/api-key.guard.ts`, exported as `ApiKeyGuard`, and the decorator in `src/auth/public.decorator.ts`, exported as `Public`.

Several teams have e2e suites that boot `AppModule` with `Test.createTestingModule` and don't care about auth. They will switch it off with

```ts
Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(ApiKeyGuard).useValue({ canActivate: () => true })
```

so make sure that works. Add e2e tests in `test/` for both the real guard and the overridden one. Build with `npm run build`, test with `npm test`.
