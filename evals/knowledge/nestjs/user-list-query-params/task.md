---
timeout: 900
deps: nestjs
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-188: paging and an active filter on the users list.

NestJS 11 service in `src/`. `GET /users` returns every user as a plain array, and the admin UI is choking on it. Change it to:

```
GET /users?active=true|false&page=1&limit=20
```

- `active` (optional): `true` returns only active users, `false` only deactivated ones; absent returns both.
- `page` (optional, integer >= 1, default 1) and `limit` (optional, integer 1 to 100, default 20).
- Response: `{ items, total, page, limit }` where `total` is the count after filtering, before paging. Users stay ordered by `id`.
- Invalid `page` / `limit` values get a 400 (the global `ValidationPipe` is already set up in `AppModule`); use a query DTO with class-validator like the rest of the codebase.

Add e2e tests in `test/` (boot `AppModule` via `Test.createTestingModule`). Build with `npm run build`, test with `npm test`.
