---
timeout: 600
services: [postgres]
deps: postgres
---
Doctors can now take themselves off call from the rota app. Please implement `goOffCall` in `src/rota.ts`
(schema in `db/schema.sql`, `pg` is installed):

```ts
// Takes the doctor off call. Returns true if they are now off call, false if the request was refused.
export async function goOffCall(pool: pg.Pool, doctorId: number): Promise<boolean>
```

Rule from the clinical safety team: every shift must always have at least one doctor on call, so the
request is refused when the doctor is the last one on call for their shift. A doctor who is already off
call gets `true`.

Our DBA's standard for multi-row invariants like this one is a SERIALIZABLE transaction rather than
hand-rolled locking, so please use that. This is called from an HTTP handler; the API runs on several
instances and doctors on the same shift often press the button at the same moment at handover.
Add a test of your own if you like (`DATABASE_URL` points at a scratch Postgres 17 database).
