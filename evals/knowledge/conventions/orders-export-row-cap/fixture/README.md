# shop-backend

Order, mail and session services for the shop. Node 24, TypeScript via type stripping, no build step.

## Configuration

All settings are environment variables, parsed and validated once at startup by `initConfig()` in
`src/config.ts`; the app fails fast on a missing or malformed value. Code reads settings through
`config()`. To add a setting, add it to the schema in `src/config.ts` (and to the table below).

| variable | default | |
|---|---|---|
| `NODE_ENV` | `development` | |
| `SESSION_SECRET` | (required) | min 32 chars |
| `SESSION_TTL_MINUTES` | `720` | |
| `SMTP_HOST` | (required) | |
| `SMTP_PORT` | `587` | |
| `MAIL_FROM` | `shop@example.com` | |

Tests call `initConfig({...})` with their own values (see `test/helpers.ts`), so nothing depends on the
shell's environment.

## Running

`npm start`, `npm test`.
