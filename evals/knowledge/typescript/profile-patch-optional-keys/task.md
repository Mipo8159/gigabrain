---
timeout: 900
deps: typescript
check: npx tsc -p hidden/tsconfig.json && node --test --test-reporter=dot 'hidden/**/*.test.ts'
---
Implement `PATCH /profiles/:id` in this repo (the HTTP wiring is someone else's job; you own the logic).

In `src/profile-patch.ts`, implement and export:

```ts
export function parseProfilePatch(body: unknown): ProfilePatch;
export async function patchProfile(repo: ProfileRepo, id: string, body: unknown): Promise<Profile>;
```

- `body` is the parsed JSON request from the mobile app. The wire format is snake_case: `display_name` (string, 1–80 chars after trimming), `bio` (string up to 500 chars, or `null` to clear it), `timezone` (non-empty string), `marketing_opt_in` (boolean). Every field is optional; send only what changed.
- Invalid input throws `ValidationError` from `src/errors.ts`. Unknown profile id throws `NotFoundError`.
- `patchProfile` validates, then calls `repo.update(id, patch)` and returns the updated profile.
- `ProfilePatch`, `Profile` and `ProfileRepo` live in `src/domain.ts` and are shared with other modules; don't change them.

zod 4 is installed. `npm run typecheck` must stay clean (the tsconfig is the team's standard one). Add tests under `test/` if you like (`npm test`).
