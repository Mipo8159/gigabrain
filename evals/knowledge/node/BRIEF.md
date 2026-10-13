# Knowledge brief: Node.js runtime (Node 22 / 24)

Slug: `node`. Researched 2026-10-12. Every trap marked **[ran]** was reproduced
locally on Node v24.21.0 (scratch scripts, not kept in the repo).

## Mental model

1. Node runs your JS on one thread. Anything CPU-heavy and synchronous freezes every request, timer and socket until it ends.
2. The event loop runs in phases: timers, I/O polling, `setImmediate` (check), close callbacks. Between callbacks it drains two queues: `process.nextTick`, then promise microtasks.
3. Microtasks never let I/O or timers in. Only returning to the loop (a macrotask such as `setImmediate`) does that.
4. A promise that rejects with no handler attached by the end of that turn crashes the process (default `--unhandled-rejections=throw` since Node 15).
5. Streams are buffers with a high-water mark. `write()` returning `false` means stop until `'drain'`. `stream/promises` `pipeline` wires up errors, cleanup and backpressure for you; `.pipe()` does not handle errors.
6. Cancellation is `AbortController` / `AbortSignal`. One signal can cancel fetch, timers, streams, `events.once` and child processes. Timeouts reject with `TimeoutError`, not `AbortError`.
7. `fetch` is undici. Bodies you never read keep sockets busy. HTTP 4xx/5xx responses do not reject. Network failures arrive as `TypeError('fetch failed')` with the real error in `.cause`.
8. A graceful shutdown means: on SIGTERM, stop accepting connections, finish in-flight requests, close idle keep-alive sockets, then exit. A hard deadline backs this up.
9. Worker threads get their own isolate. Data crosses by structured clone or transfer, never by sharing objects, so prototypes and functions do not cross.
10. `AsyncLocalStorage` carries request context across `await`. A callback stored now and run later by shared code loses that context unless you bind it.
11. Node 22.12+ and 24 can `require()` synchronous ESM. An ESM `import` of CommonJS gets named exports only for patterns a static scanner can see.
12. Node 24 runs `.ts` files by stripping the types only. Anything TypeScript would have to emit as JavaScript (`enum`, parameter properties, runtime `namespace`) is a hard error.

## Traps

### 1. Ordering of nextTick and promises differs in ESM entry modules [ran]
- **Mistake:** Assuming `process.nextTick` always runs before `Promise.then` callbacks, so the code depends on that order (for example, to emit an event "before" an awaited consumer sees a result).
- **Correct:** That holds in CommonJS. In an ES module the top-level code itself runs inside a promise job, so the microtask queue drains first. `Promise.resolve().then(A); process.nextTick(B)` prints A then B in `.mjs` and B then A in `.cjs`. If ordering matters, use `queueMicrotask` everywhere. Node's docs recommend it over `nextTick` for new code.
- **Source:** https://nodejs.org/api/process.html#when-to-use-queuemicrotask-vs-processnexttick
- **Testable how:** `scheduler.mjs` exports `runOrdered(log)`, which must push `['first','second']` given a spec ("first" is scheduled through API X, "second" through API Y). The hidden test spawns `node scheduler.mjs` as ESM and checks the order. The nextTick-first assumption fails.
- **Likelihood an LLM gets it wrong:** high. Every textbook says "nextTick runs before promises" and leaves out the ESM caveat.

### 2. `await Promise.resolve()` does not yield to the event loop [ran]
- **Mistake:** Making a long CPU loop "cooperative" by chunking it with `await null` or `await Promise.resolve()` between chunks.
- **Correct:** Those are microtasks, and timers and I/O stay starved. Yield with a macrotask: `await setImmediate()` from `node:timers/promises`, or `await new Promise(setImmediate)`. Measured over 100 ms of chunked work: a 1 ms `setInterval` fired **0** times with the microtask yield and **101** times with the `setImmediate` yield. For truly heavy work, move it to a `worker_threads` Worker.
- **Source:** https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick , https://nodejs.org/api/timers.html#timerspromisessetimmediatevalue-options
- **Testable how:** Implement `sumPrimesCooperative(n)`. The hidden test starts a `setInterval(…, 1)` counter (or `perf_hooks.monitorEventLoopDelay`), awaits the function, and asserts the counter advanced at least N times, or that the p99 delay is under 50 ms.
- **Likelihood an LLM gets it wrong:** high. "await yields" is a very common half-truth.

### 3. A rejection handled "later" still crashes the process [ran]
- **Mistake:** `const a = getA(); const b = getB(); await a; await b;` inside `try/catch`. If `b` rejects before `a` settles, nothing is attached to `b` yet.
- **Correct:** Node's default `--unhandled-rejections=throw` (since v15) raises at the end of that turn. The process exits with code 1, and the later `try/catch` never runs. Use `Promise.all` / `Promise.allSettled`, or attach `.catch` right away.
- **Source:** https://nodejs.org/api/cli.html#--unhandled-rejectionsmode , https://nodejs.org/api/process.html#event-unhandledrejection
- **Testable how:** `loadDashboard()` starts three loaders in parallel and must return `{ok:false, failed:['b']}` when loader b rejects fast and a resolves slowly. The hidden test runs it in a child process and asserts exit code 0 plus the output. The naive version dies with code 1.
- **Likelihood an LLM gets it wrong:** med. Models know about `Promise.all`, but they write "start early, await later" for parallelism quite often.

### 4. `AbortSignal.timeout()` rejects with `TimeoutError`, not `AbortError` [ran]
- **Mistake:** `catch (e) { if (e.name === 'AbortError') return 'timed out' }` around `fetch(url, { signal: AbortSignal.timeout(ms) })`.
- **Correct:** A timeout signal aborts with a `DOMException` named `'TimeoutError'`. Only a manual `controller.abort()` gives `'AbortError'`. To combine a user cancel with a timeout, use `AbortSignal.any([userSignal, AbortSignal.timeout(ms)])` (Node 20.3+) and check `signal.reason` / `e.name` for both names. The timeout's timer is unref'd, so it does not keep the process alive.
- **Source:** https://nodejs.org/api/globals.html#static-method-abortsignaltimeoutdelay , https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
- **Testable how:** `getWithTimeout(url, ms, userSignal)` must resolve `{status:'timeout'}` on timeout, `{status:'cancelled'}` on a user abort and `{status:'error'}` otherwise, against a local `http` server that never responds. Branching on `AbortError` labels a timeout as "error".
- **Likelihood an LLM gets it wrong:** high. AbortError checks are everywhere in older code and tutorials.

### 5. A fetch timeout cleared after the headers arrive leaves the body read unbounded [ran]
- **Mistake:** `const t = setTimeout(() => ac.abort(), ms); const res = await fetch(url, {signal}); clearTimeout(t); return res.json();`. The same mistake appears as `Promise.race([fetch(), sleep(ms)])`, which never cancels anything.
- **Correct:** The signal also governs body consumption. Keep it alive until the body is read, or just pass `AbortSignal.timeout(ms)` and do not clear it. A server that sends headers and then trickles the body hung for more than 1 s with the clear-after-headers pattern. The same server rejected at about 300 ms with `TimeoutError` when the signal stayed active. undici's own defaults (`headersTimeout` and `bodyTimeout` of 300 s) are far too long to be a request timeout.
- **Source:** https://undici.nodejs.org/#/docs/api/Dispatcher?id=parameter-dispatchoptions , https://nodejs.org/api/globals.html#fetch
- **Testable how:** `fetchJson(url, {timeoutMs: 300})` runs against a local server that sends headers at once and then one byte every 100 ms forever. The hidden test asserts it rejects within 600 ms.
- **Likelihood an LLM gets it wrong:** med-high. The timeout-wraps-the-call pattern is the common habit.

### 6. Unconsumed fetch bodies stop keep-alive socket reuse [ran]
- **Mistake:** `const res = await fetch(url); if (res.ok) return true;` without reading or cancelling the body. Typical places are health checks, HEAD-like probes and status-only calls.
- **Correct:** undici returns a socket to the pool only after the body ends. Always `await res.arrayBuffer()`/`.text()`, or `await res.body?.cancel()`. Measured over 10 sequential fetches of a 200 KB body: unconsumed bodies opened **10** server sockets, consumed bodies opened **2**. Under load this means connection exhaustion and memory growth.
- **Source:** https://undici.nodejs.org/#/?id=garbage-collection (README "Garbage Collection" section), https://nodejs.org/api/globals.html#fetch
- **Testable how:** `checkAll(urls)` returns an array of status codes. The hidden test counts `server.on('connection')` while calling it 20 times against one origin and asserts at most 3 connections.
- **Likelihood an LLM gets it wrong:** med. Models know the browser, where this does not matter.

### 7. `req.on('close')` is not a "client disconnected" signal [ran]
- **Mistake:** Cancelling server-side work with `req.on('close', () => ac.abort())`.
- **Correct:** Since Node 16, `IncomingMessage` emits `'close'` as soon as the request body has been consumed, which for a POST is right after you read it. With a body read via `for await`, `req` 'close' fired at 7 ms while the response was still pending. Listen on `res.on('close')` and treat it as a disconnect only when `!res.writableFinished`.
- **Source:** https://nodejs.org/api/http.html#class-httpincomingmessage (`'close'` event), https://nodejs.org/api/http.html#class-httpserverresponse (`'close'` event, `writableFinished`)
- **Testable how:** The server runs a 300 ms job per POST and must abort the job (incrementing `aborted`) only when the client disconnects. The hidden test sends one normal POST, which expects 200 and `aborted===0`, then one POST aborted by the client at 100 ms, which expects `aborted===1`. The `req`-close version aborts every POST.
- **Likelihood an LLM gets it wrong:** high. The pre-16 idiom is all over Stack Overflow.

### 8. Graceful shutdown: `server.close()` waits on keep-alive sockets that are still busy [ran]
- **Mistake:** `process.on('SIGTERM', () => server.close(() => process.exit(0)))` and nothing more, or the reverse mistake, `server.closeAllConnections()`, which kills in-flight requests.
- **Correct:** `server.close()` (since v19) stops listening and closes connections that are idle *at that moment*. A keep-alive connection that is mid-request at SIGTERM stays open after its response until `keepAliveTimeout` (5 s) or the client drops it. Measured: exit took about 3.5 s, and with the fix it took about 0.5 s. Fix: set a `stopping` flag; while stopping, send `Connection: close` on responses (or call `server.closeIdleConnections()` after each response finishes); add a hard-deadline `setTimeout(...).unref()` that calls `closeAllConnections()`. In-flight requests must still complete with 200, and new connections get refused.
- **Source:** https://nodejs.org/api/http.html#serverclosecallback , https://nodejs.org/api/http.html#servercloseidleconnections , https://nodejs.org/api/http.html#serverkeepalivetimeout
- **Testable how:** The hidden test forks `server.mjs`, warms a keep-alive socket, starts a 500 ms request, and sends SIGTERM at 100 ms. It asserts the request gets `200 done`, a new request gets `ECONNREFUSED`, and the child exits with code 0 within 1500 ms. The naive version takes too long; `closeAllConnections` fails the in-flight request.
- **Likelihood an LLM gets it wrong:** high. "server.close then exit" is the stock answer, and the keep-alive detail is rarely mentioned.

### 9. `.pipe()` neither forwards errors nor cleans up; manual writes ignore backpressure [ran]
- **Mistake:** `src.pipe(transform).pipe(dest)` with one `'error'` handler on `dest`, or a loop of `dest.write(chunk)` that ignores the return value.
- **Correct:** Use `pipeline` from `node:stream/promises`. It rejects on any stage's error and destroys every stream; it also accepts async generator transforms and `{ signal }`. After a destination error, `.pipe()` left the source **not destroyed**, while `pipeline` destroyed it. For manual writes, `if (!dest.write(c)) await once(dest, 'drain')`. The naive loop buffered 20 000 bytes against a 1 024 B high-water mark.
- **Source:** https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-options , https://nodejs.org/en/learn/modules/backpressuring-in-streams
- **Testable how:** (a) `copyUpper(src, dest)` must reject when `dest` errors, and the test asserts `src.destroyed === true`. (b) `writeAll(dest, chunks)` against a slow `Writable({highWaterMark:1024})`: the test samples `dest.writableLength` on every write and asserts the peak stays at or below 1024 plus one chunk.
- **Likelihood an LLM gets it wrong:** med. Models know `pipeline`, but `.pipe()` and fire-and-forget writes still show up.

### 10. Multi-byte UTF-8 split across chunks is corrupted by `str += chunk` [ran]
- **Mistake:** `let s = ''; for await (const c of stream) s += c;` or `chunk.toString()` per `'data'` event.
- **Correct:** Each Buffer gets decoded on its own, so a 4-byte emoji split across chunks becomes `�` characters. Use `stream.setEncoding('utf8')` (it uses a StringDecoder internally), `text()` from `node:stream/consumers`, `Buffer.concat` before decoding, or `TextDecoderStream`. Reproduced: `'héllo 🙂 wörld'` in 3-byte chunks became `'héllo ��� wörld'`.
- **Source:** https://nodejs.org/api/stream.html#readablesetencodingencoding , https://nodejs.org/api/webstreams.html#class-textdecoderstream , https://nodejs.org/api/string_decoder.html
- **Testable how:** `countWords(readable)` or `readAllText(readable)`. The hidden test feeds `Readable.from()` chunks of 1 to 3 bytes containing emoji and Georgian text and asserts exact equality.
- **Likelihood an LLM gets it wrong:** med-high. It passes on ASCII fixtures, so the naive version looks fine.

### 11. Async EventEmitter listeners turn errors into unhandled rejections [ran]
- **Mistake:** `emitter.on('job', async (j) => { await process(j) })` with an `'error'` listener, assuming that throws land in `'error'`.
- **Correct:** `emit()` ignores the returned promise, so a rejection becomes an `unhandledRejection` and crashes the process by default. Options: `new EventEmitter({ captureRejections: true })` (or `events.captureRejections = true`), which routes it to `'error'` (or `Symbol.for('nodejs.rejection')`), or a `try/catch` inside the listener. Also: emitting `'error'` with no listener throws. `events.once(em, 'x')` rejects if `'error'` fires first.
- **Source:** https://nodejs.org/api/events.html#capture-rejections-of-promises , https://nodejs.org/api/events.html#error-events
- **Testable how:** The `JobQueue extends EventEmitter` runs async handlers. The hidden test (child process) registers a handler that throws and asserts the queue emits `'error'` with that error and the process exits with code 0.
- **Likelihood an LLM gets it wrong:** med-high. `captureRejections` is obscure.

### 12. Abort listeners pile up on long-lived signals (a memory leak) [ran]
- **Mistake:** Every operation calls `signal.addEventListener('abort', cleanup)` on a shared, app-lifetime signal (a shutdown signal, for example) and never removes it.
- **Correct:** Remove the listener when the operation finishes. Use `{ once: true }` plus `removeEventListener` in `finally`, or `events.addAbortListener(signal, fn)` (added v20.5 / v18.18), which returns a `Disposable`, so `using d = addAbortListener(...)` also works (explicit resource management ships with V8 13.6 in Node 24). Measured: 20 operations left 20 listeners; with dispose, 0. Inspect with `events.getEventListeners(signal, 'abort')`.
- **Source:** https://nodejs.org/api/events.html#eventsaddabortlistenersignal-listener , https://nodejs.org/api/events.html#eventsgeteventlistenersemitterortarget-eventname
- **Testable how:** `runTask(fn, shutdownSignal)` runs 1 000 times. The hidden test asserts `getEventListeners(shutdownSignal,'abort').length === 0`, and that aborting during a task still cancels it.
- **Likelihood an LLM gets it wrong:** med. The leak is invisible in short tests.

### 13. AsyncLocalStorage context is lost when callbacks are batched or pooled [ran]
- **Mistake:** Request context via `als.run(ctx, …)`, plus a shared batcher or pool that stores callbacks and runs them later from one timer, or EventEmitter listeners expected to see the context they were registered in.
- **Correct:** Callbacks run in the context of whoever *triggers* them. Two requests (A, B) enqueued into one batcher both saw `'A'`; an emitter listener saw the emitter's context, not its registration context. Capture at enqueue time with `AsyncLocalStorage.bind(fn)` or `AsyncLocalStorage.snapshot()` (Stable since v23.11 / v22.15), or `AsyncResource.bind`. Prefer `run()` over `enterWith()` (experimental, leaks into the rest of the sync scope). Since Node 24.0, ALS is backed by `AsyncContextFrame` by default; the API is unchanged.
- **Source:** https://nodejs.org/api/async_context.html#static-method-asynclocalstoragebindfn , https://nodejs.org/api/async_context.html#asynclocalstorageenterwithstore , https://nodejs.org/en/blog/release/v24.0.0
- **Testable how:** `logger.mjs` adds `requestId` from ALS; `batchWriter.add(msg, cb)` flushes every 10 ms. The hidden test runs 2 concurrent `als.run({requestId})` blocks and asserts each callback logs its own id.
- **Likelihood an LLM gets it wrong:** med-high. ALS "just works across await", and the batching edge case is rarely mentioned.

### 14. Worker `postMessage` loses prototypes, functions and custom Error fields; transfer detaches [ran]
- **Mistake:** Posting class instances and calling their methods in the worker, posting objects with function fields, relying on `err.code` from a worker-posted Error, or reusing an `ArrayBuffer` after putting it in the transfer list.
- **Correct:** Structured clone yields plain objects: the prototype becomes `Object.prototype`, methods and getters vanish, and functions throw `DataCloneError`. `Error` keeps `message`/`name`/`stack`, but **own props like `code` are dropped** (verified). `Map`/`Set`/`Date` survive. A transferred `ArrayBuffer` has `byteLength 0` in the sender. Send plain DTOs and rehydrate them, and serialise error fields explicitly. Errors thrown in the worker arrive as the Worker `'error'` event, and an unhandled one ends the worker.
- **Source:** https://nodejs.org/api/worker_threads.html#considerations-when-cloning-objects-with-prototypes-classes-or-accessors , https://nodejs.org/api/worker_threads.html#portpostmessagevalue-transferlist
- **Testable how:** `runInWorker(task)` returns a `Money` instance (has `.format()`) and rejects with an error whose `.code` equals the worker's. The hidden test asserts `result instanceof Money` and `err.code === 'E_LIMIT'`.
- **Likelihood an LLM gets it wrong:** med. Clone basics are known; the dropped `code` and the rehydration step are missed.

### 15. Node 24 type stripping: no enums, no parameter properties, `import type`, `.ts` extensions [ran]
- **Mistake:** Writing normal TypeScript for `node file.ts`: `enum Status {}` / `const enum`, `constructor(private repo: Repo)`, `import { User } from './types'` (type-only, no `type` keyword, no extension), `tsconfig` `paths` aliases, decorators.
- **Correct:** Node strips types only. Type stripping is on by default since v23.6 / v22.18, warning-free since v24.3, and Stable since v24.12 / v25.2. `enum`, parameter properties, runtime `namespace` and import-equals all throw `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. A type-only import without `type` throws "does not provide an export named 'User'". Imports need explicit `.ts`. `tsconfig.json` is ignored, and `.ts` files under `node_modules` are refused. `--experimental-transform-types` was **removed in v26.0.0**. Use `as const` objects plus union types, explicit fields, and `import type`. Enforce with tsc `erasableSyntaxOnly` + `verbatimModuleSyntax` + `rewriteRelativeImportExtensions`. `node --test` also picks up `*.test.ts` by default.
- **Source:** https://nodejs.org/api/typescript.html#type-stripping
- **Testable how:** The task is "add an `OrderStatus` type and an `OrderService` with an injected repo in `src/*.ts`". The hidden test is `node --test` running a `.test.ts` that imports them. Any enum, parameter property or bare type import fails at load time.
- **Likelihood an LLM gets it wrong:** high. Idiomatic TypeScript habits (enum, `private` constructor args) clash with it directly.

### 16. ESM/CJS interop edges: invisible named exports, `require(esm)` shape and top-level await [ran]
- **Mistake:** (a) `import { foo } from './lib.cjs'` where lib does `module.exports = api` (a variable): SyntaxError, because cjs-module-lexer cannot see the names. (b) `const f = require('./esm.mjs')` expecting the default export, when it returns the namespace (`{ default, … , __esModule }`). (c) Adding top-level `await` to an ESM module that CJS code `require()`s.
- **Correct:** (a) Use `import lib from './lib.cjs'; lib.foo`, or write `exports.foo = …` / `module.exports = { foo, bar }` with literal keys. (b) `require(esm)` is unflagged since v22.12 / v20.19 and returns the namespace object; use `.default`, or have the ESM do `export { x as 'module.exports' }`. (c) Top-level await gives `ERR_REQUIRE_ASYNC_MODULE`. In ESM use `import.meta.dirname` / `import.meta.filename` (v20.11+), and `import.meta.main` exists since v24.2.
- **Source:** https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require , https://nodejs.org/api/esm.html#commonjs-namespaces
- **Testable how:** A mixed package: `legacy.cjs` requires `config.mjs`, and `app.mjs` imports helpers from `util.cjs`. The hidden test spawns both entry points and asserts the output. Breakage comes from adding async config loading with top-level await, or from destructuring a named import from `util.cjs`.
- **Likelihood an LLM gets it wrong:** med. (a) and (c) are commonly hit; (b) is newer than most training data.

### Stale beliefs (do not build cases on these, the model may "fix" what is not broken)
- "`t.test()` subtests must be awaited or they are cancelled": since **v24.0.0** the runner waits for subtests automatically (release notes; verified, an unawaited subtest ran and passed). The API docs page still carries the old warning.
- `node:assert` `deepEqual` is loose (`{a:1}` deep-equals `{a:'1'}`, verified). Use `node:assert/strict`. This is the textbook basic, low value.

## Versions checked

As of 2026-10-12:

| Line | Latest | Status | Source |
|---|---|---|---|
| 22 "Jod" | v22.23.3 (2026-09-23) | Maintenance LTS since 2025-10-21, EOL 2027-04-30 | https://nodejs.org/dist/index.json , https://github.com/nodejs/Release/blob/main/schedule.json |
| 24 "Krypton" | v24.21.0 (2026-09-07) | Active LTS; moves to Maintenance 2026-10-20, EOL 2028-04-30 | same |
| 25 | v25.9.0 | EOL 2026-06-01 | same |
| 26 | v26.11.1 (2026-10-07) | Current; becomes LTS 2026-10-28 | same |

- Local run environment: Node v24.21.0, bundled undici 7.29.1 (`process.versions.undici`).
- Node 24.0 notes: ALS on AsyncContextFrame, undici 7, V8 13.6 (`using`, `Float16Array`, `RegExp.escape`), global `URLPattern`, the test runner auto-awaits subtests, and `url.parse()` is runtime-deprecated. https://nodejs.org/en/blog/release/v24.0.0
- Type stripping history (on by default v23.6/v22.18, stable v24.12/v25.2, transform-types removed v26.0): https://nodejs.org/api/typescript.html
