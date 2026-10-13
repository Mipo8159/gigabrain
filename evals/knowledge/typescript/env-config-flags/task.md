---
timeout: 900
deps: typescript
check: npx tsc -p hidden/tsconfig.json && node --test --test-reporter=dot 'hidden/**/*.test.ts'
---
We're replacing the ad-hoc `process.env` reads in this service with one validated config object. Implement `loadConfig` in `src/config.ts`:

```ts
export function loadConfig(env: Record<string, string | undefined>): Config;
```

`Config` is already defined in that file. Variables (these are what ops already set in our Helm values and `.env` files, so match them):

| Variable | Field | Rules |
|---|---|---|
| `PORT` | `port` | integer 1–65535, default 8080 |
| `DATABASE_URL` | `databaseUrl` | required |
| `LOG_LEVEL` | `logLevel` | `debug` / `info` / `warn` / `error`, default `info` |
| `ENABLE_BETA_CHECKOUT` | `enableBetaCheckout` | on/off flag, default off. Ops write `true`/`false`; some older manifests use `1`/`0` |
| `REQUEST_TIMEOUT_MS` | `requestTimeoutMs` | positive integer, default 5000 |
| `MAX_UPLOAD_MB` | `maxUploadMb` | optional positive integer; leave it out of the config when not set (no limit) |

Our Helm chart renders a value that isn't set as an empty string (`PORT=""`), so treat empty the same as not set. Anything invalid must throw at startup with an error that names the variable.

zod 4 is installed if you want it. `npm run typecheck` must stay clean.
