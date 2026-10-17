# Fact-check: Node.js and TypeScript exams

Date: 2026-10-15. Baseline: Node.js 24 (Active LTS; v26 is Current, v22 Maintenance), checked against local node v24.21.0 and nodejs.org docs v24.x.
Files: evals/knowledge/node/exams/v1-v5.json, evals/knowledge/typescript/exams/v1-v5.json.

## node/exams/v1.json

| id | verdict | source | note |
|---|---|---|---|
| node-v1-q01 | ok | known | stream/cursor vs sync stringify |
| node-v1-q02 | ok | known | microtasks drain before I/O |
| node-v1-q03 | ok | known | pbkdf2 + fs share 4-thread pool |
| node-v1-q04 | ok | known | ReDoS is sync |
| node-v1-q05 | ok | known | ELU + loop delay |
| node-v1-q06 | ok | known | |
| node-v1-q07 | ok | known | |
| node-v1-q08 | ok | known | |
| node-v1-q09 | ok | known | |
| node-v1-q10 | ok | known | write()/drain |
| node-v1-q11 | ok | known | pipeline destroys all stages |
| node-v1-q12 | ok | known | subarray is a view; Buffer.from copies |
| node-v1-q13 | ok | known | |
| node-v1-q14 | ok | https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md | bodyTimeout default 300 s confirmed |
| node-v1-q15 | ok | known | AbortSignal.any since v20.3 |
| node-v1-q16 | ok | https://nodejs.org/docs/latest-v24.x/api/http.html#serverkeepalivetimeout | v24 default 5000 ms confirmed (plus 1 s keepAliveTimeoutBuffer since 24.6; still < 60 s) |
| node-v1-q17 | ok | known | unread body holds socket |
| node-v1-q18 | ok | known | |
| node-v1-q19 | ok | known | default throw |
| node-v1-q20 | ok | known | |

## node/exams/v2.json

| id | verdict | source | note |
|---|---|---|---|
| node-v2-q01 | ok | known | |
| node-v2-q02 | ok | known | |
| node-v2-q03 | ok | known | |
| node-v2-q04 | ok | known | async zlib on threadpool |
| node-v2-q05 | ok | known | pino serializes on main thread |
| node-v2-q06 | ok | known | |
| node-v2-q07 | ok | known | |
| node-v2-q08 | ok | known | |
| node-v2-q09 | ok | known | transfer detaches buffer |
| node-v2-q10 | ok | known | |
| node-v2-q11 | ok | known | |
| node-v2-q12 | ok | known | sync, ~2x heap |
| node-v2-q13 | fixed | local run node v24.21.0 | `for await (c of fetchRes.body) buf += c` yields "123,34,..." (Uint8Array to string), not UTF-8 text; stem changed to `http.get` + `for await (const c of res)` (Buffers), where the split-char bug is real |
| node-v2-q14 | ok | local run node v24.21.0 | fetch with AbortSignal.any rejects TimeoutError vs AbortError, confirmed |
| node-v2-q15 | ok | known | req 'close' after body since v16 |
| node-v2-q16 | ok | known | |
| node-v2-q17 | ok | known | |
| node-v2-q18 | ok | known | PID 1 signals |
| node-v2-q19 | ok | known | |
| node-v2-q20 | ok | known | |

## node/exams/v3.json

| id | verdict | source | note |
|---|---|---|---|
| node-v3-q01 | ok | known | capacity math |
| node-v3-q02 | ok | known | |
| node-v3-q03 | ok | known | dns.lookup on threadpool, resolve* via c-ares |
| node-v3-q04 | ok | known | |
| node-v3-q05 | ok | known | |
| node-v3-q06 | ok | known | |
| node-v3-q07 | ok | known | os.cpus() reports host cores |
| node-v3-q08 | ok | known | |
| node-v3-q09 | ok | known | |
| node-v3-q10 | ok | known | |
| node-v3-q11 | ok | known | object-mode HWM default 16 |
| node-v3-q12 | ok | known | |
| node-v3-q13 | ok | known | |
| node-v3-q14 | ok | https://nodejs.org/docs/latest-v24.x/api/events.html#eventsaddabortlistenersignal-listener | Disposable, stable in v24; `using` removes listener (local run) |
| node-v3-q15 | ok | known | |
| node-v3-q16 | ok | known | |
| node-v3-q17 | ok | local run node v24.21.0 | server.close() waited ~6.5 s for a busy keep-alive socket (5 s + 1 s buffer) |
| node-v3-q18 | ok | known | |
| node-v3-q19 | fixed | https://nodejs.org/docs/latest-v24.x/api/module.html | `module.register` is deprecated (DEP0205) since v24.15; OTel's doc uses `--experimental-loader=@opentelemetry/instrumentation/hook.mjs` (https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md). Reworded key/why/explain, replaced the 404 OTel ref |
| node-v3-q20 | ok | known | |

## node/exams/v4.json

| id | verdict | source | note |
|---|---|---|---|
| node-v4-q01 | ok | known | |
| node-v4-q02 | ok | known | |
| node-v4-q03 | ok | known | |
| node-v4-q04 | ok | known | async generateKeyPair on threadpool |
| node-v4-q05 | ok | known | |
| node-v4-q06 | ok | known | |
| node-v4-q07 | ok | known | |
| node-v4-q08 | ok | known | |
| node-v4-q09 | ok | known | pg connectionTimeoutMillis default 0 = wait forever |
| node-v4-q10 | ok | known | |
| node-v4-q11 | ok | known | |
| node-v4-q12 | ok | known | |
| node-v4-q13 | ok | known | zlib maxOutputLength |
| node-v4-q14 | ok | known | fetch resolves on 5xx |
| node-v4-q15 | ok | https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md | keepAliveTimeout 4e3, server hint overrides (minus 2e3 threshold) |
| node-v4-q16 | ok | known | err.cause |
| node-v4-q17 | ok | known | hedging |
| node-v4-q18 | ok | known | |
| node-v4-q19 | ok | known | |
| node-v4-q20 | ok | known | label cardinality |

## node/exams/v5.json

| id | verdict | source | note |
|---|---|---|---|
| node-v5-q01 | ok | known | 30 cores of work + headroom |
| node-v5-q02 | ok | known | |
| node-v5-q03 | ok | known | |
| node-v5-q04 | ok | known | |
| node-v5-q05 | ok | known | |
| node-v5-q06 | ok | known | |
| node-v5-q07 | ok | known | |
| node-v5-q08 | fixed | https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html | nodejs24.x drops callback handlers; distractor's why said the flag "applies to callback-style handlers" as if usable; reworded, ref added |
| node-v5-q09 | ok | known | |
| node-v5-q10 | ok | known | |
| node-v5-q11 | ok | known | |
| node-v5-q12 | ok | known | quadratic concat |
| node-v5-q13 | ok | known | bulkheads |
| node-v5-q14 | ok | known | |
| node-v5-q15 | ok | known | timers/promises setTimeout takes signal |
| node-v5-q16 | ok | known | |
| node-v5-q17 | ok | known | |
| node-v5-q18 | ok | known | |
| node-v5-q19 | ok | known | |
| node-v5-q20 | ok | known | |

## typescript/exams/v1.json

Baseline: TypeScript 7.0.2 is npm `latest` (7.1 dev on `next`); TS 7.0 = Go port, no JS API until 7.1, `@typescript/typescript6` for API users (https://devblogs.microsoft.com/typescript/?p=5246).

| id | verdict | source | note |
|---|---|---|---|
| typescript-v1-q01 | ok | known | |
| typescript-v1-q02 | ok | known | |
| typescript-v1-q03 | fixed | https://zod.dev/api#stringbool | stringbool also accepts on/off, y/n, enabled/disabled (case-insensitive); key text listed only three pairs then said "rejects anything else"; added "(and a few similar pairs)" |
| typescript-v1-q04 | ok | known | |
| typescript-v1-q05 | ok | known | satisfies/excess-property checks only on fresh literals |
| typescript-v1-q06 | ok | known | |
| typescript-v1-q07 | ok | known | |
| typescript-v1-q08 | ok | local run node v24.21.0 | enum -> ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX in strip-only mode |
| typescript-v1-q09 | ok | known | |
| typescript-v1-q10 | ok | known | |
| typescript-v1-q11 | ok | known | |
| typescript-v1-q12 | ok | known | |
| typescript-v1-q13 | ok | known | |
| typescript-v1-q14 | ok | https://devblogs.microsoft.com/typescript/?p=5246 | 7.0 checks like 6.0 |
| typescript-v1-q15 | ok | known | noUncheckedIndexedAccess not in strict |
| typescript-v1-q16 | ok | known | |
| typescript-v1-q17 | fixed | https://devblogs.microsoft.com/typescript/?p=5246 | key confirmed (no API in 7.0, typescript6 package); distractor why said native-preview "is frozen" (not stated); now "nightlies now come from `typescript@next`" (npm dist-tag next = 7.1.0-dev) |
| typescript-v1-q18 | ok | local run node v24.21.0 | enum + parameter property -> ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX; decorators SyntaxError |
| typescript-v1-q19 | ok | known | dual-package hazard; require(esm) in Node 22.12+ |
| typescript-v1-q20 | fixed | local run node v24.21.0 | Node names the re-exported source module: error says `'./customer.ts'`, not `'./models/index.ts'`; stem message corrected |

## typescript/exams/v2.json

| id | verdict | source | note |
|---|---|---|---|
| typescript-v2-q01 | ok | local run zod 4 | coerce.number("") = 0, default not applied |
| typescript-v2-q02 | fixed | local run zod 4 | z.coerce.date() rejects "garbage" (invalid Date fails); distractor why claimed Invalid Date passes; now cites null -> 1970 and "10/15/2026" local-time parse (both verified) |
| typescript-v2-q03 | ok | known | |
| typescript-v2-q04 | ok | known | |
| typescript-v2-q05 | ok | local run tsc 7.0.2 | `catch (e: Error)` -> TS1196 |
| typescript-v2-q06 | ok | known | |
| typescript-v2-q07 | ok | known | |
| typescript-v2-q08 | ok | known | destructured discriminant does not narrow rest |
| typescript-v2-q09 | ok | known | |
| typescript-v2-q10 | ok | known | |
| typescript-v2-q11 | ok | known | |
| typescript-v2-q12 | ok | known | |
| typescript-v2-q13 | ok | known | |
| typescript-v2-q14 | ok | local run zod 4 | `.exactOptional()` exists |
| typescript-v2-q15 | ok | local run tsc 7.0.2 | satisfies flags missing `payments`; `as` does not |
| typescript-v2-q16 | fixed | local run tsc 7.0.2 and 5.9 | `.filter(o => !!o)` DOES infer `o is Owner` for an object type (second correct answer); distractor changed to `.filter(o => Boolean(o))`, which does not narrow (verified) |
| typescript-v2-q17 | ok | known | |
| typescript-v2-q18 | ok | https://devblogs.microsoft.com/typescript/?p=5246 | baseUrl removed in 7.0 |
| typescript-v2-q19 | ok | https://devblogs.microsoft.com/typescript/?p=5246 | types [] and rootDir ./ defaults |
| typescript-v2-q20 | ok | known | isolatedDeclarations |

## typescript/exams/v3.json

| id | verdict | source | note |
|---|---|---|---|
| typescript-v3-q01 | ok | known | |
| typescript-v3-q02 | ok | known | z.object strips unknown keys |
| typescript-v3-q03 | ok | local run zod 4 | coerce.date(null) = epoch |
| typescript-v3-q04 | ok | known | |
| typescript-v3-q05 | ok | known | |
| typescript-v3-q06 | ok | known | |
| typescript-v3-q07 | ok | known | |
| typescript-v3-q08 | ok | local run tsc 7.0.2 | NoInfer rejects "queud" |
| typescript-v3-q09 | ok | known | |
| typescript-v3-q10 | ok | known | |
| typescript-v3-q11 | ok | known | |
| typescript-v3-q12 | ok | known | |
| typescript-v3-q13 | ok | known | |
| typescript-v3-q14 | ok | local run tsc 7.0.2 | TS2578 confirmed |
| typescript-v3-q15 | ok | local run tsc 7.0.2 | method syntax bivariant, property syntax rejected (TS2416) |
| typescript-v3-q16 | ok | local run tsc 7.0.2 | forEach(async) compiles under strict + noImplicitReturns |
| typescript-v3-q17 | ok | local run node v24.21.0 | require(esm) works; TLA -> ERR_REQUIRE_ASYNC_MODULE |
| typescript-v3-q18 | ok | known | |
| typescript-v3-q19 | ok | local run node v24.21.0 | ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING confirmed |
| typescript-v3-q20 | ok | https://devblogs.microsoft.com/typescript/?p=5246 | stableTypeOrdering, order-dependent results rare |

## typescript/exams/v4.json

| id | verdict | source | note |
|---|---|---|---|
| typescript-v4-q01 | fixed | local run node v24.21.0 | key ok, but "only a string keeps all 64 bits / lost before any code runs" is false: `JSON.parse` reviver `context.source` (ES2025, in Node 24) recovers 9007199254740993n. Softened why + explain to "plain JSON.parse" |
| typescript-v4-q02 | ok | known | Map stringifies to {} |
| typescript-v4-q03 | ok | known | |
| typescript-v4-q04 | ok | known | |
| typescript-v4-q05 | ok | known | |
| typescript-v4-q06 | ok | known | mapped type + satisfies |
| typescript-v4-q07 | ok | known | |
| typescript-v4-q08 | ok | known | |
| typescript-v4-q09 | ok | known | |
| typescript-v4-q10 | ok | known | |
| typescript-v4-q11 | ok | known | |
| typescript-v4-q12 | ok | known | |
| typescript-v4-q13 | ok | known | |
| typescript-v4-q14 | ok | known | |
| typescript-v4-q15 | ok | known | |
| typescript-v4-q16 | ok | known | |
| typescript-v4-q17 | ok | known | per-file module format |
| typescript-v4-q18 | ok | known | TS1543 + Node JSON import attribute |
| typescript-v4-q19 | ok | known | |
| typescript-v4-q20 | ok | known | |

## typescript/exams/v5.json

| id | verdict | source | note |
|---|---|---|---|
| typescript-v5-q01 | ok | known | |
| typescript-v5-q02 | ok | known | |
| typescript-v5-q03 | ok | known | |
| typescript-v5-q04 | ok | known | ValidationPipe whitelist |
| typescript-v5-q05 | ok | known | |
| typescript-v5-q06 | ok | known | |
| typescript-v5-q07 | ok | known | |
| typescript-v5-q08 | ok | known | |
| typescript-v5-q09 | ok | https://devblogs.microsoft.com/typescript/?p=5246 | 7.0 has no JS API |
| typescript-v5-q10 | ok | known | |
| typescript-v5-q11 | ok | known | |
| typescript-v5-q12 | ok | known | |
| typescript-v5-q13 | ok | known | |
| typescript-v5-q14 | ok | local run tsc 7.0.2 + zod 4 | optional() fails under exactOptionalPropertyTypes, exactOptional() assigns |
| typescript-v5-q15 | ok | known | |
| typescript-v5-q16 | ok | known | return vs return await |
| typescript-v5-q17 | ok | known | rewriteRelativeImportExtensions (5.7) |
| typescript-v5-q18 | ok | https://devblogs.microsoft.com/typescript/?p=5246 | node10 removed |
| typescript-v5-q19 | ok | local run tsc 7.0.2 | TS1294 on enum |
| typescript-v5-q20 | fixed | https://nodejs.org/en/about/previous-releases | key ok (@types/node latest 26.6.5). Distractor why "26 is the Current line, not LTS" goes stale when v26 is promoted to LTS later in Oct 2026; reworded to a reason that does not expire |
