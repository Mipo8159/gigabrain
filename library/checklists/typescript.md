---
name: checklist-typescript
description: Reviewer checklist for TypeScript/JavaScript diffs — loaded by the reviewer agent when the diff touches .ts/.tsx/.js/.jsx/.mjs/.cjs, package.json or tsconfig*.json.
metadata:
  type: library
  source: ecc
  upstream: [agents/typescript-reviewer.md, rules/typescript/coding-style.md, rules/typescript/patterns.md, rules/typescript/security.md, rules/typescript/testing.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# TypeScript / JavaScript review checklist

Applies when: `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`, `package.json`,
`tsconfig*.json` in the diff. For `.tsx`/`.jsx`, also load `react.md`.

Before reading: run the project's own type check (`npm run typecheck --if-present`,
else `tsc --noEmit -p <tsconfig that owns the changed files>`, not blindly the
root one) and its lint script. A red type check or lint is a finding in itself.

## Blockers

- **Dynamic execution of input**: `eval`, `new Function`, `vm.runIn*` with
  anything user-derived → remote code execution.
- **`child_process` with input**: `exec`/`execSync` with interpolated strings →
  shell injection. Use `execFile`/`spawn` with an argument array and an allowlist.
- **Query built by concatenation**: template strings into SQL/NoSQL queries, or ORM
  `raw`/`$queryRawUnsafe` with interpolation → injection. Parameterise.
- **Path traversal**: user input into `fs.*`/`path.join` without `path.resolve` +
  a prefix check against the allowed root → reads/writes outside it.
- **Prototype pollution**: deep-merge/`Object.assign` of untrusted objects into
  shared objects, or keys like `__proto__`/`constructor` accepted unvalidated →
  every object in the process changes.
- **Unvalidated external data at a boundary**: request bodies, queue messages,
  webhook payloads, `JSON.parse` results used as a typed value with no schema
  (zod/joi/yup/class-validator) → the type is a lie at runtime.
- **Floating promises**: async call without `await`/`.catch()` in handlers,
  constructors or event listeners → unhandled rejection; the failure is lost or
  takes the process down.
- **`array.forEach(async ...)`**: nothing awaits it → the function returns before
  the work finishes; errors are unhandled. Use `for...of` or `Promise.all`.

## Should-fix

- **`any` without a stated reason** (explicit, or implicit from a missing type on an
  exported function) → type checking switched off downstream. Use `unknown` + narrowing,
  a precise type, or a generic.
- **`as` casts to silence the compiler** (`as unknown as X`, cast to an unrelated
  type) → hides a real mismatch. Fix the type.
- **Non-null assertions `x!`** with no preceding guard → runtime `undefined` errors.
- **`tsconfig` weakened** (strictness options turned off) → call out explicitly.
- **Exported functions / public methods without parameter and return types.**
- **Swallowed errors**: empty `catch {}`, or `catch (e)` that logs and continues
  where the caller needed to know → silent failure (see `silent-failures.md`).
- **`JSON.parse` on external input without try/catch** → throws on bad input.
- **`throw "string"` / throwing non-`Error`** → no stack trace; `instanceof Error`
  checks fail.
- **`catch (e)` reading `e.message` without narrowing** (`e` is `unknown`) → crashes
  on non-Error throws.
- **Sequential `await` in a loop for independent work** → latency multiplied;
  use `Promise.all` (bounded if the target is rate-limited).
- **Mixed callbacks and promises** in one flow → errors escape one of the paths.
- **Synchronous fs/crypto in request handlers** (`readFileSync`, `pbkdf2Sync`) →
  blocks the event loop for every request.
- **`process.env.X` read deep in code with no startup validation** → the app boots
  and fails later on first use. Validate required config at startup.
- **`require()` mixed into ESM** (or `import` in CJS) without intent → load-order
  and interop bugs.
- **N+1 calls**: DB/API calls inside a loop → batch or `Promise.all`.
- **Module-level mutable state** in server code → shared across requests/tenants.
- **Whole-library imports in frontend code** (`import _ from 'lodash'`) → bundle
  size; use named or per-method imports.
- **`console.log` left in production paths** → use the project's logger.

## Nits

- `var`, `==` instead of `===`.
- Magic numbers/strings that deserve a named constant.
- `a?.b?.c?.d` with no `?? fallback` where `undefined` is not a valid result.
- `enum` where a string-literal union would do (unless interop needs the enum).
- `interface` for unions / `type` for extendable object shapes: follow the repo's
  convention first.

## Not this checklist's job

- React hooks, RSC boundaries, accessibility → `react.md`.
- SQL/schema/migration specifics → `database.md`; auth, secrets, cloud config →
  `security.md`; swallowed errors and bad fallbacks in depth → `silent-failures.md`.
