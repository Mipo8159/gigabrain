---
timeout: 900
deps: nestjs
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-163: audit feed.

NestJS 11 service in `src/`. `OrdersModule` records domain events (`order.created`, `order.cancelled`) in the in-memory event log from `EventLogModule` (`src/events/`). Support wants to see them.

- Add an `AuditModule` in `src/audit/` with `GET /audit/events`, returning the recorded events newest first, as `[{ seq, type, payload, at }]`.
- Optional `?type=order.cancelled` filters by event type.
- Keep audit decoupled from orders: `AuditModule` must not import `OrdersModule` (audit is moving to its own service next quarter and will read the log the same way). Use the event log module the way `OrdersModule` does.

Add e2e tests in `test/` (boot `AppModule` via `Test.createTestingModule`, as in `test/health.e2e.test.ts`). Build with `npm run build`, test with `npm test`.
