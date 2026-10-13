---
timeout: 900
deps: nestjs
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-140: filtering on the tickets list.

NestJS 11 service in `src/`. `GET /tickets` currently returns every ticket. The frontend's shared data-table component sends filters the same way it does for our other services, as bracketed query params:

```
GET /tickets?filter[status]=open&filter[assignee]=ana
```

- `filter[status]` (optional): one of `open`, `in_progress`, `closed`. Any other value is a 400.
- `filter[assignee]` (optional): exact match on the assignee username.
- Both given: AND. Neither given: all tickets, as today.

App-wide setup lives in `configureApp()` in `src/app.setup.ts`; it is called by `main.ts` and by the e2e tests after `createNestApplication()`. Please add e2e coverage in `test/`, following `test/tickets.e2e.test.ts`. Build with `npm run build`, test with `npm test`.
