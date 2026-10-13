# Migrations

Plain SQL files in `db/migrations/`, named `NNNN_snake_case_name.sql` and applied in order of the
number by `db/migrate.ts`. Applied versions are recorded in `schema_migrations`; a file is never edited
after it has shipped, add a new one instead.

Each file runs inside its own transaction, so a failing migration leaves nothing half-applied.

Some statements can't run inside a transaction block (`CREATE INDEX CONCURRENTLY`,
`ALTER TYPE ... ADD VALUE` before PG 12, `VACUUM`). Put `-- migrate:no-transaction` on the first line of
such a file and keep it to that single statement; the runner then sends it on its own, outside a
transaction. See `0003_orders_customer_id_idx.sql`.
