---
timeout: 900
deps: nestjs
check: node node_modules/typescript/bin/tsc -p hidden/tsconfig.json > /dev/null; node --test --test-reporter=dot '.check/hidden/**/*.test.js'
check_timeout: 240
---
Ticket TRK-112: create projects over the API.

This is a NestJS 11 service (`src/`). There is a `ProjectsModule` with `GET /projects` backed by the in-memory `ProjectsService`. Please add `POST /projects`:

- Body: `name` (required string, 1 to 80 chars), `key` (required, 2 to 5 uppercase letters, e.g. `WEB`), `description` (optional string, max 500 chars).
- On success respond 201 with the created project (`id`, `name`, `key`, `description`), and it shows up in `GET /projects`.
- Invalid bodies (missing or wrongly typed fields, bad key format) are rejected with 400.

Add e2e tests for the new endpoint next to `test/health.e2e.test.ts` and follow the same setup: our e2e suites boot `AppModule` through `Test.createTestingModule`. Build with `npm run build`, test with `npm test`.
