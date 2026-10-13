---
timeout: 900
deps: typescript
check: npx tsc -p hidden/tsconfig.json && node --test --test-reporter=dot 'hidden/**/*.test.ts'
---
The new team page needs two read endpoints. Implement the handlers in `src/users/handlers.ts`:

```ts
export function makeUserHandlers(repo: UsersRepo): {
  getUser(id: string): Promise<{ status: 200; body: PublicUser } | { status: 404; body: { error: string } }>;
  listTeam(teamId: string): Promise<{ status: 200; body: PublicUser[] }>;
};
```

- `GET /users/:id` → `getUser`, `GET /teams/:id/members` → `listTeam` (members sorted by `displayName`). Routing and JSON serialisation are done by the framework; `body` is what gets serialised.
- Any logged-in user can call these, so the response is the `PublicUser` view defined in `src/users/types.ts`.
- `UsersRepo` is in `src/users/repo.ts` (Postgres in prod).

`npm run typecheck` must stay clean.
