---
timeout: 900
deps: typescript
heldout: true
check: npx tsc -p hidden/tsconfig.json && node --test --test-reporter=dot 'hidden/**/*.test.ts'
---
Last week a flow shipped with `initial: 'idel'` and nothing caught it until production. `defineMachine` in `src/fsm.ts` is typed with plain `string`, so state names are never checked.

Make `defineMachine` generic so the compiler checks state names:

- State names come from the `states` array written at the call site, e.g. `defineMachine({ states: ['idle', 'uploading', 'done'], initial: 'idle', transitions: { idle: ['uploading'] } })`. Call sites must not need `as const` or explicit type arguments.
- A name that isn't in `states` is a compile error wherever it appears: `initial`, a `transitions` key, a transition target, and the arguments to `machine.can(...)` / `machine.next(...)`.
- `transitions` may leave states out (terminal states have no entry).
- `machine.initial`, `machine.states` and the return of `next` are typed as the union of the state names, not `string`.
- Runtime behaviour stays as it is today.

Keep the export name and the `defineMachine(config)` call shape. `src/flows/upload.ts` is an existing call site: its machine definition stays as written; adjust the code around it if the stricter types require. `npm run typecheck` must be clean.
