---
name: checklist-security
description: Reviewer checklist for security-sensitive diffs — loaded by the reviewer agent when the diff touches auth, routes/endpoints, user input, file uploads, payments, webhooks, outbound fetches, dependencies, IAM/IaC, CI pipelines or cloud config.
metadata:
  type: library
  source: ecc
  upstream: [agents/security-reviewer.md, rules/common/security.md, skills/security-review/cloud-infrastructure-security.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# Security review checklist

Applies when: auth/session code, new or changed routes/handlers, input parsing,
file uploads, payments/balances, webhooks, outbound HTTP to configurable URLs,
dependency changes, IAM policies, IaC (serverless.yml, CDK, CloudFormation,
Terraform), CI workflows, security groups, buckets, DB exposure.
If the diff adds dependencies, run the package manager's audit
(`npm audit --audit-level=high` or the equivalent).

## Blockers

- **Route/handler/resolver with no authentication** where siblings have it.
- **Object-level authorization missing**: handler loads a record by id from the
  request and acts on it without checking the caller owns/may access it → any
  user can read/modify others' data (IDOR).
- **Injection**: string-built SQL/NoSQL, shell commands with input, template
  rendering of raw input, XML parsers with external entities enabled.
- **Plaintext or fast-hash passwords** (`===`, MD5/SHA for passwords) → use
  bcrypt/argon2 with their compare functions. (SHA/MD5 for checksums is fine.)
- **JWT/session not validated** before trusting its claims; session cookies
  not secure/httpOnly.
- **Money/balance/stock check without a lock or atomic update** → double spend.
- **Outbound fetch of a user-supplied URL** with no domain allowlist → SSRF.
- **Untrusted deserialization** of user input (pickle, YAML load, `eval`-based
  parsers).
- **Hardcoded credentials** in code, IaC, CI config, docs or tests not clearly
  fake. Any credential that reached the diff must be rotated, not just removed.
- **IAM wildcards**: `Action: "*"`/`s3:*` or `Resource: "*"` where a specific
  action/ARN is known → blast radius of a compromise is the whole account.
- **Long-lived cloud keys** in CI or app config where OIDC / role assumption is
  available.
- **Public data stores**: S3 bucket public ACL/policy, `publicly_accessible = true`
  on a DB, DB/SSH/RDP security-group ingress from `0.0.0.0/0`.

## Should-fix

- **No rate limiting** on login, signup, password reset, OTP, or expensive
  endpoints.
- **Missing CSRF protection** for cookie-authenticated state-changing requests.
- **CORS misconfigured** (wider than the clients that need it).
- **Error responses leak internals** (stack traces, SQL, sensitive data); fail
  securely.
- **Sensitive data logged**: passwords, tokens, full card/PII in logs or error
  messages; security events (failed logins, admin actions) *not* logged.
- **Secrets not in a secrets manager / not validated at startup**; no rotation
  plan for DB credentials and API keys.
- **Debug mode, default credentials, or permissive settings** enabled in a prod
  config path; missing security headers / CSP where the app serves HTML.
- **CI workflow**: broad default `permissions`, secrets exposed to untrusted PR
  workflows, no secret scan or dependency audit step, `npm install` instead of
  `npm ci` (lockfile not enforced).
- **Data at rest/in transit**: new storage without encryption, plain HTTP between
  services that cross a network boundary.
- **Backups/PITR disabled** or retention dropped on a production data store.
- **New or bumped dependency with known advisories** (audit not clean).

## Common false positives (verify before flagging)

- Values in `.env.example`, clearly fake test fixtures, intentionally public keys
  (publishable/client ids).

## Not this checklist's job

- Framework-specific XSS/secret-in-bundle → `react.md`; query performance and
  migrations → `database.md`; language-level injection sinks also appear in
  `typescript.md`, `python.md`, `go.md`.
