# Contributing to identity-service

- Node 24 with TypeScript type stripping. No build step, no runtime dependencies.
- Logging goes through `log` from `src/lib/log.ts` (structured JSON, one event name per line, context as
  fields). The log pipeline ships to a third-party vendor, so the logger masks personal data (emails,
  phone numbers, names, IPs, password hashes) by field name. Pass whole objects as fields rather than
  formatting them into the message.
- Tests capture log output with `captureLogs()` instead of reading stdout.
- Password hashing lives in `src/lib/password.ts`; never compare hashes with `===`.
