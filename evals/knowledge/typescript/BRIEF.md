# TypeScript (backend) — knowledge-eval brief

Researched 2026-10-12. Every trap below marked "verified" was reproduced in a scratch
project with `typescript@7.0.2`, `zod@4.6.7`, `@types/node`, Node 24.21.0, using this
tsconfig unless the trap says otherwise:

```json
{ "compilerOptions": { "module": "nodenext", "noEmit": true,
  "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true,
  "verbatimModuleSyntax": true, "erasableSyntaxOnly": true,
  "allowImportingTsExtensions": true, "types": ["node"] } }
```

## Mental model

1. TypeScript checks your code, then disappears. At runtime only JavaScript is left, so a type is a promise you made, not a check that happens.
2. Data that comes from outside (HTTP body, JSON.parse, env vars, the database) is `unknown` until a runtime validator such as zod has checked it.
3. Types are compared by shape, not by name. Anything with the right fields fits, and that includes objects with extra fields you did not want.
4. The strict flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) make types tell the truth about "maybe missing" values. They feel noisy, and the noise is the point.
5. Model states as a union with a `kind` field. A `never` check in the `default` branch then makes the compiler list every place you forgot when a new state is added.
6. `satisfies` checks a value against a type without throwing away its precise type. An annotation (`: T`) throws the precise type away.
7. Node 22.18+/24 can run `.ts` files directly by deleting the types. That only works for code where deleting the types leaves valid JS, so no `enum`, no `namespace` with values, no constructor parameter properties.
8. Under `module: nodenext` the file on disk decides ESM vs CommonJS, and relative imports need real file extensions.
9. TypeScript 7 is the Go rewrite ("tsgo"), shipped as the normal `typescript` package with the `tsc` binary. It checks types the same way as 6.0. 6.0 and 7.0 changed several defaults (strict on, `types: []`), so configs copied from 5.x tutorials break.
10. JSON has no Date, Map, BigInt or undefined. After a round trip a Date is a string, even though your type still says Date.
11. zod v4 changed many v3 habits. Coercion is blunt (`"false"` becomes `true`), and the defaults for optional, default and unknown fields moved.
12. An unawaited promise is a bug the type checker rarely catches. Await it, return it, or handle it on purpose.

## Traps

### 1. `noUncheckedIndexedAccess`: a length check does not narrow `a[0]`
- **Mistake:** writing `if (arr.length > 0) { const s: string = arr[0]; }`, or `const n: number = counts[key]` on a `Record<string, number>`, and expecting it to compile. A related mistake is adding `!` everywhere to silence the errors.
- **Correct:** with the flag on, index reads have type `T | undefined` even after a length check. Use `const [first] = arr` plus a check, `arr.at(0)` plus a check, or `const v = rec[k]; if (v === undefined) ...`. Iteration with `for...of` and `.entries()` is not affected (verified).
- **Source:** https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess
- **Testable how:** type test. The hidden tsconfig turns the flag on, and the build must pass `tsc --noEmit` with no `!` on index reads (grep for `]!`). A runtime test calls `firstOrDefault([])` and `countFor(map, "missing")` and expects the default, not `undefined` or NaN.
- **Likelihood an LLM gets it wrong:** high. The flag is not part of `strict`, most training code has it off, and the length-check pattern looks safe.

### 2. `exactOptionalPropertyTypes`, including zod output types
- **Mistake:** `const o: { a?: string } = { a: maybeString }` where `maybeString: string | undefined`. A second form is assigning `z.infer` of `z.string().optional()` to a domain type `{ nick?: string }`, which fails because zod infers `nick?: string | undefined` (verified).
- **Correct:** omit the key, e.g. `{ ...(x !== undefined && { a: x }) }` or a conditional spread. Or declare `a?: string | undefined` when undefined really is allowed. In zod 4 use `z.string().exactOptional()` (it exists in 4.6.7 and infers `nick?: string`, verified).
- **Source:** https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes ; https://zod.dev/api#optionals
- **Testable how:** type test. A hidden file assigns the project's parsed request type to the domain type and must compile under the flag. A runtime test checks `Object.hasOwn(result, "nick") === false` when no nick was given, which catches `{ nick: undefined }` leaking into JSON or DB updates.
- **Likelihood an LLM gets it wrong:** high. The flag is rare in training data, and the zod/`exactOptional` interaction is new in v4.

### 3. `satisfies` vs a type annotation
- **Mistake:** `const cfg: Config = { port: 3000, mode: "dev" }` and then expecting `cfg.port` to be a `number` or `cfg.mode` to be `"dev"`. The annotation widens them to `number | string` and `Mode`. The opposite mistake is using `as Config`, which hides missing keys.
- **Correct:** `const cfg = { ... } as const satisfies Config` checks the shape and keeps the literal types (verified: with `satisfies`, `port` stays `number`; with the annotation it is `string | number`).
- **Source:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator
- **Testable how:** type test. A hidden file does `const p: number = routes.health.port` and `// @ts-expect-error` on a typo key such as `routes.helth`. Both only pass with `satisfies` (no annotation, no `as`).
- **Likelihood an LLM gets it wrong:** medium. LLMs know `satisfies`, but they default to annotations and reach for `as` under pressure.

### 4. Exhaustiveness with `never`, and narrowing that silently doesn't happen
- **Mistake:** a `switch` on `kind` without a `default: assertNever(x)`, so a new union member compiles and falls through and returns `undefined`. A related mistake is expecting `.filter(Boolean)` or `.filter(x => !!x)` to narrow `(T | null)[]` to `T[]`. Neither does (verified). TS 5.5 infers a predicate only for checks like `x !== null`. Another is destructuring the discriminant (`({ kind, ...rest })`), which stops `rest` from narrowing (verified). A last one is `typeof x === "object"` keeping `null` in the type.
- **Correct:** `default: { const _: never = ev; throw new Error(...) }`. That gives a compile error when a member is added and a runtime throw for bad input that got past the types. Filter with `x => x !== null` or an explicit `(x): x is T =>` guard.
- **Source:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking ; https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates
- **Testable how:** runtime is the main check: pass `{ kind: "bogus" } as any` and expect a throw, not `undefined`. Type test: the harness copies the handler file, appends a member to the union with `sed`, and expects `tsc` to fail (TS2322 on the `never` line). It also compiles `const xs: Item[] = compact(rows)` against the project's filter helper.
- **Likelihood an LLM gets it wrong:** medium. The pattern is well known, but LLMs often skip the runtime throw or use `filter(Boolean)`.

### 5. Structural typing leaks extra fields
- **Mistake:** `const pub: PublicUser = dbUser; return res.json(pub)`. The excess-property check only runs on fresh object literals, so `passwordHash` compiles and is serialized (verified: assigning a variable with extra keys is not an error).
- **Correct:** build the output explicitly (`{ id: u.id, name: u.name }`), or parse it through a zod schema. The default `z.object` strips unknown keys (verified); `z.looseObject` would keep them.
- **Source:** https://www.typescriptlang.org/docs/handbook/2/objects.html#excess-property-checks ; https://zod.dev/api#objects
- **Testable how:** runtime. `node --test` calls `toPublicUser(dbRow)` and asserts `Object.keys(result)` deep-equals the allow-list, with no `passwordHash`.
- **Likelihood an LLM gets it wrong:** high. The code type-checks, looks idiomatic, and the leak is invisible without a runtime key check.

### 6. Method shorthand is bivariant
- **Mistake:** declaring a port as `interface Handler { handle(e: Event): void }` and thinking `strictFunctionTypes` protects it. An implementation that takes only `ClickEvent` is accepted (verified).
- **Correct:** use property syntax, `handle: (e: Event) => void`, which is checked contravariantly and rejects the narrower implementation (verified).
- **Source:** https://www.typescriptlang.org/tsconfig/#strictFunctionTypes
- **Testable how:** type test. A hidden file does `// @ts-expect-error` on `const h: Handler = { handle(e: ClickEvent) {} }`. It fails ("unused directive") if the project used method syntax.
- **Likelihood an LLM gets it wrong:** high. Method syntax is the default style in interfaces and almost nobody knows about the exemption.

### 7. Branded types must actually block raw values
- **Mistake:** `type UserId = string` (an alias blocks nothing), or a brand that can be built by a bare cast all over the codebase, or mixing `UserId` and `OrderId` because both are `string & {...}` with the same brand key.
- **Correct:** `type UserId = string & { readonly __brand: "UserId" }` (or `unique symbol`), created only by a validating constructor or by `z.string().uuid().brand<"UserId">()`. zod brands the output only (verified: a raw `string` is rejected).
- **Source:** https://zod.dev/api#branded-types ; https://www.typescriptlang.org/play/#example/nominal-typing
- **Testable how:** type test with `// @ts-expect-error getOrder("raw-string")` and `// @ts-expect-error getOrder(userId)`. A runtime test checks that `UserId.parse("not-a-uuid")` throws.
- **Likelihood an LLM gets it wrong:** medium. A common LLM answer to "add branded IDs" is a plain alias, or a brand without a constructor.

### 8. `enum` and parameter properties crash under Node type stripping
- **Mistake:** `enum Status {...}` or `constructor(private repo: Repo) {}`, then running with `node src/main.ts`. Node throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` (verified for enum). `tsc` alone does not catch this unless `erasableSyntaxOnly` is on (verified: TS1294).
- **Correct:** `const Status = { Active: "active" } as const; type Status = typeof Status[keyof typeof Status];` plus explicit fields assigned in the constructor. Turn on `erasableSyntaxOnly` (TS 5.8+).
- **Source:** https://nodejs.org/api/typescript.html#type-stripping ; https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html#the---erasablesyntaxonly-option
- **Testable how:** runtime. The hidden test runner executes `node --test` directly on `.ts` files with no build step, so any enum or parameter property fails the whole suite. A type test compiles with `erasableSyntaxOnly: true`.
- **Likelihood an LLM gets it wrong:** high. Enums and DI-style parameter properties are everywhere in NestJS-era training data.

### 9. Type-only imports without `type` under `verbatimModuleSyntax` and stripping
- **Mistake:** `import { User, createUser } from "./user.ts"` where `User` is only a type. tsc reports TS1484 under `verbatimModuleSyntax` (verified). Node stripping fails at runtime with "does not provide an export named 'User'" (verified). Re-exports have the same problem: `export { User } from ...`.
- **Correct:** `import { type User, createUser }` or `import type { User }`, and `export type { User }`.
- **Source:** https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax ; https://nodejs.org/api/typescript.html#importing-types-without-type-keyword
- **Testable how:** runtime (run the `.ts` entry under Node) plus a type test with the flag on.
- **Likelihood an LLM gets it wrong:** medium. LLMs mostly add `type`, but they miss it in barrel re-exports.

### 10. Import specifiers under `nodenext`: extensions and JSON attributes
- **Mistake:** extensionless relative imports (`./b`; tsc error TS2835, verified). Or `./b.js` in a project that runs `.ts` directly with Node: tsc accepts it, Node throws `ERR_MODULE_NOT_FOUND` (verified). Or `import data from "./x.json"` without an attribute (TS1543 under nodenext, verified). Or `paths` aliases, which Node ignores.
- **Correct:** pick one model. To run `.ts` directly, write `./b.ts` imports with `allowImportingTsExtensions` + `noEmit`, or `rewriteRelativeImportExtensions` (TS 5.7+) when emitting. To compile to JS, write `./b.js`. Use `import data from "./x.json" with { type: "json" }`. Use `#/` subpath imports from `package.json#imports` instead of `paths` (TS 6.0 supports `#/`).
- **Source:** https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-node18-node20-nodenext ; https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html ; https://nodejs.org/api/typescript.html#module-resolution
- **Testable how:** runtime. The hidden harness runs `node --test test/*.test.ts` with no bundler and no tsx, so a mixed-up specifier fails to load. A type test compiles under nodenext.
- **Likelihood an LLM gets it wrong:** high. The `.js`-in-TS convention is drilled in, but it is wrong for direct stripping, and the JSON attribute requirement is recent.

### 11. TS 6.0 / 7.0 changed defaults and removed options
- **Mistake:** a 5.x-style tsconfig. Common forms: no `types` (6.0+ defaults to `types: []`, so `process` and `Buffer` are "Cannot find name", TS2591, verified on 7.0.2); `baseUrl` as an import root (removed in 7); `moduleResolution: "node"`/`node10` (removed); `esModuleInterop: false` (no longer allowed); `target: "es5"` (removed); relying on `rootDir` being inferred from the sources (it now defaults to the tsconfig directory, so `dist/src/...` appears). Another is assuming `tsgo` / `@typescript/native-preview` is still the way to get TS 7.
- **Correct:** set `"types": ["node"]` and an explicit `rootDir`, use `paths` relative to the project or `#/` imports, and use `nodenext` or `bundler`. TS 7 ships as `typescript@7` with the binary `tsc`; `@typescript/typescript6` (`tsc6`) exists for tools that need the 6.0 JS API, because 7.0 has no programmatic API.
- **Source:** https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ ; https://devblogs.microsoft.com/typescript/?p=5246 (TypeScript 7.0, 2026-07-08)
- **Testable how:** type test. The hidden harness runs `npx tsc -p tsconfig.json --noEmit` with `typescript@7.0.x` against the project's own config, and the source uses `process.env`. A second check asserts `outDir` contains `dist/index.js`, not `dist/src/index.js`, after a build.
- **Likelihood an LLM gets it wrong:** high. The training data is mostly 5.x, and 6.0/7.0 came out in 2026.

### 12. `unknown` at I/O boundaries, and the Date that becomes a string
- **Mistake:** `const body = await res.json() as Order` or `JSON.parse(raw) as Config` (these are `any` casts), then calling `order.createdAt.getTime()`. After JSON the value is a string (verified), so this throws at runtime. Other forms: `z.date()` on a JSON payload, which rejects ISO strings (verified); `z.coerce.date()`, which turns `null` into 1970-01-01 (verified); `z.iso.datetime()`, which rejects `+02:00` offsets by default (verified); and `catch (e) { e.message }` (TS18046 under strict, verified).
- **Correct:** treat parsed JSON as `unknown` and validate it. For dates use `z.iso.datetime({ offset: true }).transform(s => new Date(s))` (or `z.coerce.date()` behind a null check), and keep the wire type (string) separate from the domain type (Date). Narrow `catch (e)` with `e instanceof Error`.
- **Source:** https://zod.dev/api#iso-datetimes ; https://zod.dev/api#coercion ; https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables
- **Testable how:** runtime. A cache/repo round-trips an entity through `JSON.stringify` / `JSON.parse` and the test asserts `result.createdAt instanceof Date`. A second test sends `createdAt: null` and expects a validation error, not 1970. A third sends a `+02:00` timestamp and expects success.
- **Likelihood an LLM gets it wrong:** high. The `as T` on `res.json()` is the default habit, and the zod date edge cases are not obvious.

### 13. zod coercion is blunt
- **Mistake:** `z.coerce.boolean()` for query or env flags: `"false"` becomes `true` (verified). `z.coerce.number()` for an optional query param: `""` becomes `0` (verified). Using `z.number().int()` while expecting floats to be accepted (in v4 `z.int()` and `.int()` reject 1.5 and only accept safe integers).
- **Correct:** `z.stringbool()` for "true"/"false"/"1"/"0"/"yes"/"no" (verified: `"false"` becomes `false`). For numbers, check for empty input first, e.g. `z.string().trim().min(1).pipe(z.coerce.number())`, or preprocess `""` to `undefined`.
- **Source:** https://zod.dev/api#coercion ; https://zod.dev/api#stringbool
- **Testable how:** runtime. `parseEnv({ FEATURE_X: "false" }).FEATURE_X === false`, and `parseQuery({ limit: "" })` either errors or applies the default, never `0`.
- **Likelihood an LLM gets it wrong:** high. `z.coerce.boolean()` is the "obvious" answer and the trap is JavaScript's `Boolean("false")`.

### 14. zod v3 habits that are wrong in v4
- **Mistake:** `{ message: "..." }` / `invalid_type_error` / `required_error` (replaced by `error`); `z.string().email()` (deprecated, use `z.email()`); `.strict()` / `.passthrough()` (use `z.strictObject` / `z.looseObject`); single-arg `z.record(v)` (removed); expecting `z.record(z.enum([...]), v)` to allow missing keys (now exhaustive, verified: TS2741, so use `z.partialRecord`); `.default(x)` where `x` matches the input type (v4 short-circuits and `x` must be the output type, verified); expecting `z.object({ a: z.unknown() })` to accept `{}` (fails since v4.4, verified); `err.errors` / `err.flatten()` (use `err.issues` / `z.treeifyError`); expecting `.nonempty()` to infer a tuple.
- **Correct:** the v4 APIs above. Note that `.default()` on an optional field is applied: `{}` gives `{ a: "t" }` (verified).
- **Source:** https://zod.dev/v4/changelog
- **Testable how:** runtime tests for `{}` vs `{ a: undefined }`, missing record keys and default values, plus a type test that `z.input<>` / `z.output<>` of the request schema match hidden expected types (using `Expect<Equal<...>>`).
- **Likelihood an LLM gets it wrong:** high. Most zod in training data is v3. Caveat: the v4 changelog says a type predicate in `.refine()` no longer narrows, but on 4.6.7 `z.unknown().refine((v): v is string => ...)` did infer `string`. Do not build a trap on that claim.

### 15. Generic inference: `NoInfer` and `const` type parameters
- **Mistake:** `function createFsm<S extends string>(states: S[], initial: S)`. A typo in `initial` widens `S` instead of erroring (verified: `fsm(["a","b"], "c")` compiles). Another is expecting `tuple(["a", 1])` to infer `readonly ["a", 1]` without `const` (it infers `(string | number)[]`, verified).
- **Correct:** `initial: NoInfer<S>` (TS 5.4) and `<const T extends readonly unknown[]>` (TS 5.0), both verified.
- **Source:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type ; https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#const-type-parameters
- **Testable how:** type test: `// @ts-expect-error createFsm(["idle","busy"], "idel")` and `const t: readonly ["GET", "/x"] = route(["GET", "/x"])`.
- **Likelihood an LLM gets it wrong:** medium-high. Both features are relatively new and the bug compiles without complaint.

### 16. Promise typing does not catch async control-flow bugs
- **Mistake:** `items.forEach(async i => await save(i))` and then returning "done" before the saves finish. Or `try { return doAsync() } catch {}` without `await`: the rejection escapes the catch (verified: the caller sees a rejection, not the fallback). Or `Promise.all` where partial failure should be reported (`allSettled`). Or `async` handlers passed where `void` is expected (the types allow it, the rejection goes unhandled).
- **Correct:** `for...of` with `await`, or `await Promise.all(items.map(...))`; `return await` inside `try`; `Promise.allSettled` when the result must list failures. The types alone will not catch these (tsc has no floating-promise check; that needs typescript-eslint `no-floating-promises`).
- **Source:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function ; https://typescript-eslint.io/rules/no-floating-promises/
- **Testable how:** runtime. A fake `save` with a `setTimeout` delay; the test asserts all saves completed when `importAll()` resolves. A fake that rejects; the test asserts `getOrFallback()` resolves to the fallback.
- **Likelihood an LLM gets it wrong:** medium. LLMs usually avoid `forEach(async)`, but `return` without `await` inside `try` is still common.

## Versions checked

As of 2026-10-12:

| Thing | Version | Source |
|---|---|---|
| `typescript` (npm `latest`) | 7.0.2 (Go-native compiler, binary `tsc`); `next` = 7.1.0-dev nightlies; `rc` 7.0.1-rc | `npm view typescript dist-tags`; https://devblogs.microsoft.com/typescript/?p=5246 (7.0 GA, 2026-07-08) |
| TypeScript 6.0 (last JS-based) | `@typescript/typescript6` 6.0.2 (`tsc6`, 6.0 API) | `npm view @typescript/typescript6 version`; https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ |
| `@typescript/native-preview` | frozen at 7.0.0-dev.20260707.2; nightlies moved to `typescript@next` | npm dist-tags; 7.0 announcement |
| TS 7.0 programmatic API | none (expected in 7.1); Volar/Angular tooling stays on 6.0 | 7.0 announcement |
| zod | 4.6.7 | `npm view zod version`; https://zod.dev/v4/changelog |
| Node.js | 24.21.0 LTS "Krypton" (used for verification); 26.11.1 Current | https://nodejs.org/dist/index.json |
| Node type stripping | on by default since 22.18 / 23.6; stable since 24.12 / 25.2; does not read tsconfig; refuses `.ts` in node_modules | https://nodejs.org/api/typescript.html |
| `@types/node` | 26.6.5 latest (pin to the major of the Node in use) | `npm view @types/node` |

Notes for eval builders:
- Pin `typescript@7.0.x` in hidden harnesses. 7.0 has no JS API, so any test runner that imports `typescript` programmatically (ts-node, some ts-jest setups) will not work. Run `npx tsc --noEmit` as a subprocess and run `.ts` tests with plain `node --test`.
- `--stableTypeOrdering` is always on in 7.0, so error messages that print unions may list members in a different order than 6.0. Match type-test failures on error codes (e.g. TS2322, TS2578 "unused @ts-expect-error"), not on message text.
