---
timeout: 1200
allow_agents: true
check: node hidden/grade.cjs
---
Users keep emailing support to reset passwords by hand. Add self-service password reset to `src/app.js`:

- `POST /password-reset/request` with `{ email }`: if the account exists, email a link
  `https://app.example.com/reset?token=<token>` via the existing mailer. Always answer `202 { ok: true }`,
  whether or not the email is registered.
- `POST /password-reset/confirm` with `{ token, newPassword }`: sets the new password (same rules as
  signup) and answers `200 { ok: true }`. A token works once and only for 30 minutes; otherwise `400`.
- After a reset, every existing session of that user is logged out.

`createApp({ now })` takes a clock for tests. `npm test` runs the suite; add tests for the new flow.
