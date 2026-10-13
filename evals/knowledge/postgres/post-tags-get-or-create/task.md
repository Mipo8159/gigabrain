---
timeout: 600
services: [postgres]
deps: postgres
---
Authors can now tag posts. Please implement the two functions in `src/tags.ts` (schema in `db/schema.sql`,
`pg` is installed):

```ts
// Returns the id of the tag with this exact name, creating the tag if it does not exist yet.
export async function getOrCreateTag(pool: pg.Pool, name: string): Promise<number>

// Makes the post's tags exactly `names` (replacing any previous tags). `names` comes straight from the
// editor's tag input. Returns the tag ids, one per distinct name.
export async function setPostTags(pool: pg.Pool, postId: number, names: string[]): Promise<number[]>
```

Tag names are case-sensitive; no normalisation needed. This runs behind the API (several instances), and the
bulk import job calls `getOrCreateTag` from many workers in parallel, so popular tags get created by
whoever gets there first. Add a test of your own if you like (`DATABASE_URL` points at a scratch Postgres 17 database).
