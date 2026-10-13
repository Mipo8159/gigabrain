---
timeout: 900
deps: nestjs
heldout: true
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-194: bulk order import.

NestJS 11 service in `src/`. The B2B team uploads orders from spreadsheets and wants to send them in one call instead of N calls to `POST /orders`.

- Add `POST /orders/bulk`. The body is a JSON array of orders, each in exactly the shape `POST /orders` accepts (`CreateOrderDto`, including the nested `shipTo` address), 1 to 500 orders per call.
- All or nothing: if any order in the array is invalid (same rules as `POST /orders`), respond 400 and store none of them. Otherwise store all of them and respond 201 with the created orders, in input order.
- A body that is not an array is a 400 too.

Add e2e tests in `test/` (boot `AppModule` via `Test.createTestingModule`, as in `test/health.e2e.test.ts`). Build with `npm run build`, test with `npm test`.
