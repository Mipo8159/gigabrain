---
timeout: 900
deps: nestjs
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-157: cap attachment size.

NestJS 11 service in `src/`. `POST /attachments` registers an upload (the file itself goes to object storage; we only get its metadata: `{ filename, sizeBytes }`). We need a size cap:

- New setting `MAX_UPLOAD_MB`, default `10`. Ops set it per environment with the `MAX_UPLOAD_MB` environment variable (prod will run with `25`).
- `sizeBytes` above `MAX_UPLOAD_MB * 1024 * 1024` is rejected with 413. Otherwise behave as today (201).
- Settings go through `ConfigService` like the rest of the app (see `src/config/`).

Add e2e tests in `test/` (the suites boot `AppModule` with `Test.createTestingModule`). Build with `npm run build`, test with `npm test`.
