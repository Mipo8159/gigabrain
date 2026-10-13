# accounts-service

- `data/app.db` is the service's SQLite database (the Pi in the office runs this checkout directly).
- Schema changes are numbered SQL files in `migrations/`; `npm run migrate` applies the pending ones
  and records them in `schema_migrations`.
- Sessions live in Redis (`src/sessions.js`) since March 2026.
