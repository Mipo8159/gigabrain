---
timeout: 600
services: [postgres]
deps: postgres
---
The SSO login callback needs to create-or-update the local user record. Please implement `upsertUser` in
`src/users.ts` (schema in `db/schema.sql`, `pg` is installed; `softDeleteUser` already exists):

```ts
// Creates the user if there is no live (not soft-deleted) user with this email, otherwise updates that
// user's display name and last_login_at. Returns the live user's id.
export async function upsertUser(pool: pg.Pool, input: { email: string; name: string }): Promise<number>
```

Soft-deleted accounts are kept for audit and must never be touched or revived: someone who signs in again
with the email of a deleted account gets a brand-new user. Emails arrive already lower-cased from the IdP.
Users often have the app open in several tabs, so the callback can fire a few times at once for the same person.
Add a test of your own if you like (`DATABASE_URL` points at a scratch Postgres 17 database).
