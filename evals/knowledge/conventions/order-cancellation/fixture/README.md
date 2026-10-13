# orders-core

Orders and customers. Node 24 (TypeScript via type stripping), Postgres 17, `pg`. Other services
(warehouse, billing, CRM) react to our domain events on the message bus.

## Events

Domain events are written to the `outbox` table with `addToOutbox(tx, type, payload)` inside the same
transaction as the change they describe. The relay (`npm run relay`, `relayOutbox()` in
`src/events/outbox.ts`) publishes pending rows to the bus in order and marks them sent; if the bus is
down it retries on the next tick. So an event goes out if and only if its transaction committed.

## Tests

`npm test` needs `DATABASE_URL` on a disposable database (the tests recreate the schema).
