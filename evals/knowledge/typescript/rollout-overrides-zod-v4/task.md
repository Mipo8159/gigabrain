---
timeout: 900
deps: typescript
check: npx tsc -p hidden/tsconfig.json && node --test --test-reporter=dot 'hidden/**/*.test.ts'
---
The admin UI posts feature-rollout configs to us and we currently trust them blindly. Add validation.

Implement in `src/rollout.ts`:

```ts
export function parseRolloutConfig(input: unknown): ParseResult;
```

`RolloutConfig`, `ParseResult` and `REGIONS` are already in `src/types.ts`. Rules:

- `flag`: lowercase slug (`a-z`, `0-9`, `-`), 1–64 chars.
- `defaultPercent`: integer 0–100.
- `regionOverrides`: optional. Maps a region from `REGIONS` to an integer percent 0–100. Usually only one or two regions are overridden; regions not listed use `defaultPercent`. An unknown region is an error. When omitted, it's `{}`.
- `killSwitch`: optional boolean, default `false`.

On invalid input return `{ ok: false, errors }` with one entry per problem, where `path` is the dotted path to the offending field (e.g. `"regionOverrides.eu"`) so the UI can highlight it. Report all problems at once, not just the first.

zod 4 is installed (we're on zod 4 everywhere now). `npm run typecheck` must stay clean.
