# Contributing

- Node 24, TypeScript run directly by Node (type stripping): no enums, namespaces or parameter properties.
- Keep modules small; storage is the in-memory `Table` in `src/lib/store.ts` until the Postgres port lands.
- Time comes from `clock` (`src/lib/clock.ts`). Tests swap in a `FakeClock` with `useClock()` and move it
  forward with `advance()`, so expiry logic is tested without sleeping.
- Errors: throw the classes in `src/errors.ts`; the HTTP layer maps them to status codes.
- Run `npm test` before opening a PR.
