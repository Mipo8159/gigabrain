# Knowledge brief: code-practices (TypeScript backends)

Researched 2026-10-12 for gigabrain knowledge evals. Every trap below is meant to
become a tiny Node 24 TypeScript project (`node --test`, no dependencies) with a
normal-sounding feature request and hidden tests that only a careful engineer
passes. Facts marked "verified locally" were run on Node v24.21.0.

## Mental model

1. Most backend bugs sit at the edges. Data comes in (parsing, validation), crosses a boundary (SQL, filesystem, network, logs), or time moves (clocks, zones, retries).
2. A happy-path test proves almost nothing. Each trap here passes the obvious test and fails on one input that a reviewer would think to try.
3. Errors are data. Swallowing them, or turning "database is down" into "not found", is a correctness bug, not a style choice.
4. Validate at the boundary: say what you accept and reject the rest. Never copy a request body into a model wholesale.
5. Money is an integer count of minor units. Splitting and rounding have to account for every cent, and not every currency has 2 decimals.
6. Store time as an instant (UTC). Compute "days", "9am" and "next month" in the user's zone. A day is not always 24 hours.
7. Pagination has to be stable. Order by a unique key, or rows get skipped or repeated.
8. Anything user-controlled that becomes code (SQL, a path, a URL you fetch) needs an allowlist or a structural check, not string tricks.
9. Retries are normal. POST must be safe to repeat, including when two copies arrive at the same moment.
10. Tests should pin behaviour, not internals. Use injected or fake clocks rather than sleeps, so tests are fast and give the same answer every run.
11. Refactoring means the behaviour stays exactly the same, odd edge cases included. If you find a bug, report it separately.
12. Logs should let you follow one request (correlation ID) and must never contain secrets.

## Traps

### 1. Errors that vanish or get misclassified

**Variant A: async work whose errors vanish (`forEach(async …)`, catch-and-continue)**
- **Mistake:** `items.forEach(async (i) => await handle(i))`, or `try { … } catch (e) { console.error(e) }` inside a batch, so the function resolves "successfully" before the work finishes, or after part of it failed. A third variant: a fire-and-forget `void sendEmail()` with no `.catch`, which becomes an unhandled rejection. In Node that crashes the process by default (`--unhandled-rejections=throw`).
- **Correct:** Await all the work (`for…of`, `Promise.all`, or `Promise.allSettled` plus explicit aggregation). Return or throw a result that names the failures (for example `AggregateError` or `{ ok, failed: [...] }`). Chain wrapped errors with `{ cause }`.
- **Source:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled ; https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause ; https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- **Testable how:** Prompt: "Add `importContacts(rows, repo)` that saves each row and returns how many were imported." The hidden test passes a repo whose `save` rejects for row 3 and resolves the others after a `setImmediate`. It asserts that (a) when the promise settles, all non-failing saves have completed, and (b) the result reports the failure or the function rejects, rather than returning `{imported: 5}` silently. A `process.on('unhandledRejection')` spy must record zero calls.
- **Likelihood an LLM gets it wrong:** **med-high.** Models rarely write a bare `forEach(async)` now, but "log and continue" inside a batch is a very common default, and the count it returns is then wrong.

**Variant B: a catch-all that turns infrastructure failure into a client answer** (build it as a separate project)
- **Mistake:** `try { return await repo.find(id) } catch { return res.status(404) }`, or `catch { return [] }`. A DB timeout becomes "not found" or an empty list, so callers cache it and alerts never fire. The opposite mistake also happens: `res.status(500).json({ error: err.message, stack })` leaks internals.
- **Correct:** Map only known, typed domain errors (`NotFoundError`, `ValidationError`) to 4xx. Let everything else become a 500 with a generic, consistent body (for example RFC 9457 `application/problem+json`), and log it with the full cause server-side.
- **Source:** https://www.rfc-editor.org/rfc/rfc9457.html ; https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- **Testable how:** Prompt: "Add `GET /orders/:id` using the provided `OrderRepo` (returns `null` when missing)." Use a plain `node:http` handler and test it with `fetch`. Hidden tests: when the repo throws `Error('ECONNRESET')`, the response is 500 (not 404), the body contains neither "ECONNRESET" nor a stack trace, and missing and invalid ids give 404 and 400 in the same error shape.
- **Likelihood an LLM gets it wrong:** **med.** The leaked `err.message` is the more common failure. The 404-on-any-error mistake shows up when the repo throws for "not found" in some paths.

### 2. Lenient number parsing at the boundary
- **Mistake:** `const limit = Number(req.query.limit) || 20`, or `parseInt(q.limit)`. With these, `"abc"` silently becomes 20, `"10abc"` becomes 10, `"1e9"` becomes a billion, `"-5"` and `"2.5"` slip through, and `limit=0` turns into 20. A `typeof x === 'number'` check also accepts `NaN` and `Infinity` from JSON-ish inputs.
- **Correct:** Parse strictly (`/^\d+$/`, then `Number.isSafeInteger`), enforce a range, and reject anything else with 400. A clamp is acceptable only if documented. Treat a missing value and an invalid value differently.
- **Source:** https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **Testable how:** Prompt: "Add `?limit=` and `?offset=` to `GET /products` (default 20, max 100)." Hidden table test: `abc`, `10abc`, `-1`, `2.5`, `1e3`, and the empty string each give 400. `100` passes, and `101` gives 400 or exactly 100 (accept either, but never 1000 or NaN). A missing value gives 20.
- **Likelihood an LLM gets it wrong:** **high.** `Number(x) || default` and `parseInt` are the reflex. Very few implementations reject `10abc` or `1e3`.

### 3. Mass assignment on update (`{...user, ...body}`)
- **Mistake:** `PATCH /me` does `Object.assign(user, req.body)` or `repo.update(id, { ...body })`. A client can then set `role`, `isAdmin`, `id`, `ownerId`, `emailVerified` or `balance`. Merging parsed JSON into objects without checking keys also allows `__proto__` / `constructor.prototype` pollution.
- **Correct:** Use an explicit allowlist of writable fields per endpoint (a DTO), and reject or ignore unknown keys. For merges, use `Object.create(null)` objects or skip `__proto__`, `constructor` and `prototype`.
- **Source:** https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html
- **Testable how:** Prompt: "Let users update their profile (display name, bio, avatar URL) via `PATCH /me`." Hidden tests: sending `{"displayName":"x","role":"admin","id":"other"}` must leave role and id unchanged (accept 200 with them ignored, or 400). `JSON.parse('{"__proto__":{"isAdmin":true}}')` passed through any deep-merge helper must leave `({}).isAdmin` undefined.
- **Likelihood an LLM gets it wrong:** **med.** The prompt names the fields, and models often pick them explicitly. They slip when the model writes a generic `updateUser(id, patch)` helper that spreads the whole patch.

### 4. Money: floats, per-currency exponent, and the lost cent
- **Mistake:** Storing `19.99` as a float, and doing `Math.round(amount * 100)` (verified locally: `Math.round(1.005*100) === 100`, `(1.005).toFixed(2) === "1.00"`). Assuming every currency has 2 decimals (JPY has 0, KWD and BHD have 3). Splitting a total with `Math.round(total / n)` for each share, so the parts don't add up to the total.
- **Correct:** Use integer minor units (or BigInt, or a decimal string parsed digit by digit), with the exponent looked up per ISO 4217 currency. Allocate remainders deterministically (largest remainder, or the first `r` shares get +1) so that `sum(parts) === total`. Parse decimal strings without going through a float.
- **Source:** https://docs.stripe.com/currencies (zero-decimal and three-decimal currencies) ; https://www.postgresql.org/docs/current/datatype-money.html ; https://martinfowler.com/eaaCatalog/money.html
- **Testable how:** Prompt: "Add `splitBill(total: string, currency: string, people: number)` that returns each person's share in minor units, for our expense-sharing feature." Hidden tests: `("100.00","USD",3)` gives parts summing to exactly 10000, each 3333 or 3334. `("1000","JPY",3)` sums to 1000 (not 100000). `("1.005","KWD",1)` gives 1005. `("0.10","USD",3)` sums to 10.
- **Likelihood an LLM gets it wrong:** **high.** Integer cents are well known, but the remainder allocation and the non-2-decimal currencies are routinely missed.

### 5. "Today" computed in the server's zone, and date-only strings parsed as UTC
- **Mistake:** Bucketing events by `date.toISOString().slice(0,10)` or `getDate()`. That uses UTC, or the server's own zone, instead of the store's or user's zone. A related surprise: `new Date("2026-03-15")` is UTC midnight, while `new Date("2026-03-15T00:00")` is *local* midnight (verified locally: they differ by the offset).
- **Correct:** Keep instants in UTC. Convert to the business's IANA zone for calendar logic: `Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' })`, or Temporal where it is available. Write tests that set `process.env.TZ` to something far from UTC.
- **Source:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date (date-only forms are UTC, date-time forms are local) ; https://tc39.es/proposal-temporal/docs/
- **Testable how:** Prompt: "Add a daily sales report: `dailyTotals(orders, store)` where each store has a `timeZone` like `America/Los_Angeles`." Hidden test: an order at `2026-03-15T05:30:00Z` for an LA store goes in the `2026-03-14` bucket (verified locally). Run the same test with `process.env.TZ = 'Asia/Tokyo'` and `'UTC'`; the results must be identical.
- **Likelihood an LLM gets it wrong:** **high.** `toISOString().slice(0,10)` is the most common date idiom in generated code.

### 6. DST: "same time tomorrow" is not +24 hours
- **Mistake:** Computing the next run of a "daily at 09:00 local" job, or "add 1 day" to a local appointment, as `+ 86_400_000` ms. Across a DST change the job fires at 08:00 or 10:00 local. Local times that don't exist (02:30 on a spring-forward day) and local times that happen twice (01:30 on a fall-back day) are ignored.
- **Correct:** Do the arithmetic on the local calendar date and wall-clock time in the IANA zone, then convert back to an instant. Pick a documented policy for wall times that are skipped (shift forward) or repeated (use the earlier one). Temporal's `ZonedDateTime.add({days:1})` and `disambiguation: 'compatible'` encode exactly this.
- **Source:** https://tc39.es/proposal-temporal/docs/zoneddatetime.html#from (see the `disambiguation` option)
- **Testable how:** Prompt: "Add `nextRun(after: Date, localTime: '09:00', timeZone)` for our daily digest scheduler." Hidden tests: after `2026-03-07T14:00:00Z` (09:00 EST) in `America/New_York`, the next run is `2026-03-08T13:00:00Z` (09:00 EDT), not 14:00Z. Around `2026-11-01` it is 14:00Z. For a `02:30` schedule on `2026-03-08`, the result is a real instant (03:30 EDT under the "compatible" policy), never NaN or 01:30. Dependency-free: the solution has to derive offsets via `Intl.DateTimeFormat` with `timeZoneName:'longOffset'` or `formatToParts`, which is fair because Node 24 has no global `Temporal` (verified locally).
- **Likelihood an LLM gets it wrong:** **high.** Without a library, most implementations add milliseconds. Even with Intl, the offset-iteration step is usually skipped.

### 7. Month-end arithmetic overflows (Jan 31 + 1 month = Mar 3)
- **Mistake:** `d.setMonth(d.getMonth() + 1)` for subscription renewals or billing dates. JS rolls the overflow forward, so Jan 31 becomes Mar 3 (verified locally with `setUTCMonth`). Chaining renewals also drifts: Jan 31, then Feb 28, then Mar 28.
- **Correct:** Clamp to the last day of the target month, and always compute from the *anchor* day (the original day of month), not from the previous result. Temporal's `PlainDate.add({months:1})` clamps by default (`overflow: 'constrain'`).
- **Source:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setMonth ; https://tc39.es/proposal-temporal/docs/plaindate.html#add
- **Testable how:** Prompt: "Add `renewalDates(start: string, count: number)` that returns the next N monthly billing dates for a subscription." Hidden tests: from `2026-01-31` the output is `2026-02-28, 2026-03-31, 2026-04-30`. From `2028-01-31` it is `2028-02-29, …`. From `2026-01-15` it is the 15th every month.
- **Likelihood an LLM gets it wrong:** **med-high.** Clamping is often handled; anchor drift (Mar 28 instead of Mar 31) is usually missed.

### 8. Cursor pagination on a non-unique sort key
- **Mistake:** `WHERE created_at < :cursor ORDER BY created_at DESC LIMIT n`. Rows that share a timestamp across a page boundary get skipped (with `<`) or repeated (with `<=`). The offset variant has its own problem: rows inserted between page fetches shift the window and cause duplicates. A third slip: returning `nextCursor` when exactly `n` rows remain, which produces a guaranteed empty final page.
- **Correct:** Use a keyset over a unique composite `(created_at, id)`: `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC`. Encode both values in an opaque cursor, and fetch `n+1` rows to decide `hasMore`.
- **Source:** https://use-the-index-luke.com/no-offset ; https://use-the-index-luke.com/sql/partial-results/fetch-next-page
- **Testable how:** Prompt: "Add cursor pagination to `GET /events` (newest first), backed by `node:sqlite`." Hidden test: seed 7 rows where 5 share the same `created_at`, then walk the pages with `limit=2`. Every id must appear exactly once, in a stable order, and no page may be empty. A second test inserts a newer row between page 1 and page 2; nothing already seen may reappear.
- **Likelihood an LLM gets it wrong:** **high.** Single-column timestamp cursors are what most tutorials show, and seed data in happy-path tests almost never has ties.

### 9. SQL injection through the part you can't parameterize (ORDER BY, LIKE)
- **Mistake:** Values get bound correctly, but sorting is built as ``ORDER BY ${req.query.sort} ${req.query.dir}``, and search uses `LIKE '%' || ? || '%'` without escaping `%` and `_`. Another variant is building `IN (...)` lists with `ids.join(',')`.
- **Correct:** Identifiers and keywords come from an allowlist map (`{ name: 'name', price: 'price_cents' }`, with `dir` restricted to `ASC|DESC`). LIKE input gets its wildcards escaped with an `ESCAPE` clause. `IN` lists use generated placeholders.
- **Source:** https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html (allowlist for table, column and sort order) ; https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html
- **Testable how:** Prompt: "Add search and sorting to `GET /products?q=&sort=&dir=` using `node:sqlite` (`DatabaseSync`, works on Node 24)." Hidden tests: `sort=(CASE WHEN (SELECT 1 FROM secrets)=1 THEN name ELSE price END)` returns 400 and leaves the query log clean. `sort=name; DROP TABLE products` returns 400 and the table still exists. `q=50%` matches only names containing a literal "50%", not every name containing "50". `q=_` does not match everything.
- **Likelihood an LLM gets it wrong:** **high** for LIKE wildcards (almost never escaped). **Med** for ORDER BY: models increasingly use allowlists, but often only for `sort` and not for `dir`.

### 10. Webhook signature: re-serialised body, `===`, and the length throw
- **Mistake:** Verifying an HMAC over `JSON.stringify(req.body)` instead of the raw bytes, which fails or can be bypassed when key order or whitespace differs. Comparing with `===` (a timing leak). Or calling `crypto.timingSafeEqual` directly on attacker-length input: it **throws** when the byte lengths differ (Node docs), so a short header causes a 500 instead of a 401.
- **Correct:** Compute the HMAC over the raw body buffer. Decode the header hex to a buffer, check the length first (or compare fixed-length digests), then use `timingSafeEqual`. Also check a timestamp tolerance to stop replays, and reject when the header is missing.
- **Source:** https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b ; https://docs.stripe.com/webhooks#verify-manually
- **Testable how:** Prompt: "Add `POST /webhooks/payments`. The provider signs requests with `X-Signature: sha256=<hex HMAC of body>` using our shared secret." Hidden tests: a correct signature over a body with unusual spacing and key order (`{"b":1,  "a":2}`) gets 2xx. A signature of the wrong length (`sha256=ab`), a missing header, or a non-hex header all get 401, never 500. A same-length wrong signature gets 401. Spy with `t.mock.method(crypto, 'timingSafeEqual')` and accept either that or a manual constant-time loop (grade the loop in review).
- **Likelihood an LLM gets it wrong:** **med-high.** Models know `timingSafeEqual`. They often forget the length throw, and in Express-style code they very often verify the parsed body.

### 11. Path traversal: `startsWith(root)` without a separator
- **Mistake:** `const p = path.join(ROOT, name); if (!p.startsWith(ROOT)) throw …`. With ROOT `/srv/uploads`, the input `../uploads-private/secret.txt` resolves to `/srv/uploads-private/secret.txt`, which still starts with `/srv/uploads`. Other misses: decoding happens after the check (`%2e%2e%2f`), and absolute input (`/etc/passwd` with `path.resolve`) or NUL bytes aren't rejected.
- **Correct:** `const full = path.resolve(ROOT, decoded)`, then `const rel = path.relative(ROOT, full)`, and reject if `rel === ''`, `rel.startsWith('..')`, or `path.isAbsolute(rel)`. Equivalently, check `full.startsWith(ROOT + path.sep)`. Decode exactly once, before the check. For stronger guarantees, resolve symlinks with `fs.realpath`.
- **Source:** https://owasp.org/www-community/attacks/Path_Traversal ; https://nodejs.org/api/path.html#pathrelativefrom-to ; https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- **Testable how:** Prompt: "Add `GET /files/:name` that serves user-uploaded files from `./data/uploads`." The hidden fixture creates a sibling `./data/uploads-private/secret.txt`. Requests for `..%2Fuploads-private%2Fsecret.txt`, `../uploads-private/secret.txt` (called directly against the helper), `%2Fetc%2Fhosts`, and `a%00.txt` must not return the secret (any 4xx). `report.pdf` returns 200.
- **Likelihood an LLM gets it wrong:** **high.** The `startsWith(ROOT)` check without a separator is the textbook "fix", and it looks correct.

### 12. SSRF: hostname string checks, IPv6-mapped addresses, DNS and redirects
- **Mistake:** "Let users register a webhook URL / import an image by URL" with a check like `if (['localhost','127.0.0.1'].includes(url.hostname) || url.hostname.startsWith('10.'))`. This misses `[::ffff:127.0.0.1]` (the WHATWG URL normalises it to `[::ffff:7f00:1]`, so a `127.` prefix check fails; verified locally), `0.0.0.0`, `169.254.169.254`, `[::1]`, and hostnames that *resolve* to private IPs. It also lets `fetch`'s default `redirect: 'follow'` bounce to an internal address.
- **Correct:** Allowlist schemes (`https:`). Resolve the hostname (`dns.lookup(host, { all: true })`), reject if *any* address is loopback, private, link-local, ULA, unspecified or IPv4-mapped-private, then connect to the validated IP (to defeat rebinding). Use `redirect: 'manual'` and re-validate each hop. Set a timeout and a size cap.
- **Source:** https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html (disable redirects, validate resolved IPs, prefer allowlists)
- **Testable how:** Prompt: "Add `fetchPreview(url, deps)` that fetches a page and returns its `<title>`, for link previews; `deps` gives you `lookup` and `fetch`." Inject the dependencies so no network is needed. Hidden tests: `http://[::ffff:127.0.0.1]/`, `http://2130706433/`, `http://169.254.169.254/latest/meta-data`, `http://0.0.0.0/`, `http://[::1]/`, and `https://evil.test/` (fake lookup returns `10.0.0.5`) are all rejected without calling fetch. A public host whose fake fetch returns a 302 to `http://127.0.0.1/` is rejected. Assert that fetch was called with `redirect: 'manual'` (or the solution re-validates `Location`).
- **Likelihood an LLM gets it wrong:** **high.** Even when SSRF is considered, DNS resolution and redirect handling are usually missing, and the IPv6-mapped form almost always gets through.

### 13. Idempotent POST that races and ignores payload mismatch
- **Mistake:** `const hit = await store.get(key); if (hit) return hit; const r = await charge(); await store.set(key, r)`. Two concurrent requests with the same key both miss the cache and the customer is charged twice. A key reused with a *different* body replays the old response. A transient 5xx gets cached forever.
- **Correct:** Atomically claim the key before doing the work (insert-if-absent, or an in-process `Map` set synchronously before the first `await`). Store a fingerprint of the request (method, path, hash of the body). A concurrent duplicate gets 409, a mismatched payload gets 422 (IETF draft), and a completed request replays its stored status and body. Release or expire the key on failure.
- **Source:** https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ (draft-07: missing key gives 400, different payload gives 422, still in flight gives 409) ; https://docs.stripe.com/api/idempotent_requests
- **Testable how:** Prompt: "Make `POST /payments` safe for clients to retry: accept an `Idempotency-Key` header." The provided `chargeCard` fake resolves after `setImmediate`. Hidden tests: `Promise.all` of two identical requests with the same key gives exactly 1 charge, and the second response is 409 or an identical replay of the first. The same key with a different amount gives 422 and no charge. A sequential retry gives the same status and body, and `chargeCard` is called once.
- **Likelihood an LLM gets it wrong:** **high.** Check-then-set across an `await` is the default shape. The payload-mismatch rule is little known.

### 14. Correlation ID kept in shared state, and secrets in logs
- **Mistake:** Storing the request ID in a module-level variable (`let currentRequestId`) or on a singleton logger, so concurrent requests overwrite each other's IDs. Also accepting an inbound `X-Request-Id` verbatim (`"abc\n{\"level\":\"admin\"}"` enables log injection), and logging the whole `req.headers` or body (Authorization, cookies, `password`, `?token=` in the URL).
- **Correct:** Use `AsyncLocalStorage` for per-request context. Accept an inbound ID only if it matches a strict pattern (otherwise generate `crypto.randomUUID()`), and echo it in the response header. Log with structured output and a redaction allowlist or denylist for headers and fields. Strip query strings that hold credentials.
- **Source:** https://nodejs.org/api/async_context.html#class-asynclocalstorage ; https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (exclude tokens and passwords, sanitise against log injection) ; https://www.w3.org/TR/trace-context/
- **Testable how:** Prompt: "Add request logging with a request ID we can use to trace a request through the logs; the logger is injected." Hidden tests: two overlapping requests (A awaits a deferred that resolves after B finishes) produce log lines in which every A line carries A's ID and every B line carries B's. An inbound `X-Request-Id: ok-123` is kept and echoed. An inbound ID containing `\n` is replaced. A request with `Authorization: Bearer s3cr3t`, body `{"password":"hunter2"}` and URL `?token=t0k` leaves none of those three strings anywhere in the captured logs.
- **Likelihood an LLM gets it wrong:** **med.** `AsyncLocalStorage` is well known now. Header redaction and validating the inbound ID are routinely skipped.

### 15. "Refactor for readability" quietly changes behaviour
- **Mistake:** Asked to clean up a legacy function, the model "improves" it: `qty || 1` becomes `qty ?? 1` (0 used to mean 1), `==` becomes `===` (string IDs stop matching), an in-place `sort` becomes `toSorted` (callers relied on the mutation), the order of side effects and thrown error messages change, or rounding moves from per-line to per-total. Each change looks like a fix, and each one breaks callers.
- **Correct:** Write characterization tests for the current behaviour first (including odd inputs), refactor in small steps keeping them green, and report suspected bugs separately instead of fixing them in the refactor.
- **Source:** https://refactoring.com/ (a refactoring is a change that does not alter observable behaviour) ; https://martinfowler.com/bliki/DefinitionOfRefactoring.html
- **Testable how:** Prompt: "This `calculateInvoice` function is hard to read. Refactor it into smaller functions; keep the exported API." The legacy code deliberately has quirks: `qty || 1`, `discountCode == 10` for a numeric-string match, per-line `Math.round` on cents, and an error message `"Invalid item at 2"`. Hidden golden tests compare outputs and thrown messages on about 30 recorded inputs (including `qty: 0`, `discountCode: "10"` and NaN prices) against the original. Bonus check: the agent's own tests exist and cover those edges.
- **Likelihood an LLM gets it wrong:** **high.** Models modernise idioms by reflex (`??`, `===`, immutable sorts) and describe this as a cleanup.

### 16. (Meta) The agent's own tests: implementation-coupled, sleep-based, clock-dependent
- **Mistake:** When the task says "include tests", the agent writes tests that assert on private calls (`expect(repo.query).toHaveBeenCalledWith('SELECT …')`), wait with real `setTimeout(…, 1100)` for a TTL, read `new Date()` directly so results depend on the day or zone, or leave promises un-awaited so assertions run after the test ends.
- **Correct:** Assert on observable outputs. Inject a clock (`now: () => number`) or use `t.mock.timers.enable({ apis: ['Date','setTimeout'] })` (stable since v23.1.0 and in Node 24) with `tick()`. Await everything. Make tests independent of TZ and order.
- **Source:** https://nodejs.org/api/test.html#class-mocktimers ; https://testing.googleblog.com/2013/08/testing-on-toilet-test-behavior-not.html ; https://martinfowler.com/articles/nonDeterminism.html
- **Testable how:** Prompt: "Add a `TokenCache` with a per-entry TTL and tests for it." The hidden harness grades the *agent's tests*, mutation style. (a) Swap in a reference implementation with different internals; the agent's tests must still pass (catches implementation coupling). (b) Swap in 3 mutants (an off-by-one at the expiry boundary `<` vs `<=`, TTL ignored, wrong key eviction); the agent's tests must fail on each. (c) Run the agent's suite under `TZ=Pacific/Kiritimati` 10 times; wall time must stay under 2 s in total and every run must pass.
- **Likelihood an LLM gets it wrong:** **med.** Models often use fake timers when the task is about TTLs, but boundary mutants (`<` vs `<=`) usually survive their tests.

## Versions checked

| Thing | Version / status (as of 2026-10-12) | Source |
|---|---|---|
| Node release lines | Current: v26 (26.11.1). LTS: v24 "Krypton" (24.21.0) and v22 "Jod" (22.23.3). v25 is EOL. Target **Node 24** | https://nodejs.org/en/about/previous-releases ; local `node --version` = v24.21.0 |
| TypeScript in Node 24 | Type stripping is on by default and marked Stability 2 (Stable) on the v24.x branch. `enum`, parameter properties and runtime `namespace` need `--experimental-transform-types`, so **avoid them in fixtures**. tsconfig is ignored. `node --test` picks up `*.test.ts` | https://github.com/nodejs/node/blob/v24.x/doc/api/typescript.md ; https://nodejs.org/api/test.html |
| `node:test` MockTimers | Stable since v23.1.0. `apis`: `setInterval`, `setTimeout`, `setImmediate`, `Date`. `now` sets the start time. Destructured `import { setTimeout } from 'node:timers'` is not mocked | https://github.com/nodejs/node/blob/v24.x/doc/api/test.md (Class: MockTimers) |
| `crypto.timingSafeEqual` | Throws if byte lengths differ | https://github.com/nodejs/node/blob/v24.x/doc/api/crypto.md |
| `node:sqlite` (`DatabaseSync`) | Available in Node 24 without a flag. Stability 1.2 (release candidate). Good for dependency-free SQL fixtures | https://github.com/nodejs/node/blob/v24.x/doc/api/sqlite.md ; verified locally |
| `AsyncLocalStorage` | Stable | https://nodejs.org/api/async_context.html |
| Temporal | **Not** a global in Node 24 (`typeof Temporal === 'undefined'` on V8 13.6, verified locally). Date/DST traps must be solvable with `Intl.DateTimeFormat` | local check ; https://tc39.es/proposal-temporal/docs/ |
| Idempotency-Key | IETF draft-ietf-httpapi-idempotency-key-header-07 (latest revision 2025-10-15). Now expired, but still the reference for 400/409/422 | https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ |
| Problem Details | RFC 9457 (replaces 7807) | https://www.rfc-editor.org/rfc/rfc9457.html |
| OWASP cheat sheets cited | All URLs above returned HTTP 200 on 2026-10-12 | cheatsheetseries.owasp.org |
