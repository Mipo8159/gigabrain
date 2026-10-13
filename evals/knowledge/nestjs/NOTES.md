# NestJS: what the runs taught

## Baseline 2026-10-13 (vanilla Opus 5.5, write mode, 2 runs per case, Nest 11.2.7 + Express 5)

**16 of 16** (3 cases in one batch; the other 5 re-run after a usage-limit cut, all recorded as
errors then, none as fails). Vanilla Claude handled `APP_PIPE` instead of main.ts-only
`useGlobalPipes`, an overridable `APP_GUARD` via `useExisting`, the Express 5 query parser
(`filter[status]`), @nestjs/config 4 precedence, Nest 11 `forRoot` instances, request-scope
bubbling, boolean query params, and array bodies needing `ParseArrayPipe`.
