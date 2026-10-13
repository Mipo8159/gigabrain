# orders-service

Checkout and order history. Node 24 (TypeScript via type stripping), Postgres 17, `pg`.

- `npm run migrate` applies pending migrations (`db/migrations`, see `db/README.md`).
- `npm test` needs `DATABASE_URL` pointing at a disposable database: the tests drop and recreate `public`.
