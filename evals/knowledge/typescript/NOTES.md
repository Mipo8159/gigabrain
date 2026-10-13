# TypeScript: what the runs taught

## Baseline 2026-10-12 (vanilla Opus 5.5, 2 runs per case)

- Write mode: **16 of 16** (results/20261012-235037).
- No-exec mode, Bash denied, so no tsc or test runs: **16 of 16** (results/20261012-235642).

Opus already knows the post-2025 changes the brief targeted: zod v4 (`z.coerce.boolean`
turning "false" into true, `z.iso.datetime({ offset: true })`, exhaustive `z.record` over enums,
`.issues` instead of `.errors`), TS 7 strictness, Node type-stripping limits (no enums or
parameter properties, `import type`), `NoInfer`, and `exactOptionalPropertyTypes`.
Some no-exec runs read the installed `.d.ts` files, which real sessions can do too.
