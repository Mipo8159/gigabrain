---
name: auctionize-real-goal-is-transcoding-template
description: "The two end goals for the auctionize work — a battle-tested reusable serverless template, and a video-transcoding app (SNS fan-out to 3 SQS queues to 3 Lambdas) to be built incrementally, piece by piece."
metadata: 
  node_type: memory
  type: project
  originSessionId: cf63842b-e050-414c-9764-52b847448d16
  modified: 2026-08-17T09:44:12.368Z
---

Stated 2026-08-16. The auctionize repo is **not the destination** — it is being hardened into a pattern.

**Goal 1 — a reusable template.** Turn the older serverless code design into a "reliable, battle-tested, patternized template for future projects." This reframes work like the SWC/DI/middy passes: fixes are only half the value, the other half is that the resulting pattern is worth copying. Prefer solutions that generalise over one-off patches, and keep the project skills (`add-lambda`, `add-aws-resource`, `deploy-auctionize`) current, since those *are* the template's executable documentation.

**Goal 2 — a video transcoding app.** Target architecture, in the user's own terms:

- Social auth (Google/Facebook, presumably via Cognito identity providers) → per-user dashboard
- Dashboard lists that user's uploads (job list → job detail → download)
- Upload an original video → produce **480p, 720p, 1080p** renditions
- Pipeline: **upload → SNS topic → 3 SQS queues → 3 Lambdas** pulling from those queues to transcode
- Each rendition lands in its **own destination S3 bucket**
- **DynamoDB** is the database
- The `notification/` service is where processing ends: email the user with results and a link to the job detail page
- "Fully serverless" throughout

**How to work on it: piece by piece.** The user was explicit that the above is the *final* picture and "the only way getting there is piece by piece so I can understand all the steps." Do not scaffold the whole architecture in one pass. Build one slice, explain the reasoning, confirm understanding, move on. This matches [[working-style-interview-then-autonomous-loop]] but adds a teaching dimension — comprehension is a deliverable, not just working code.

**Code structure must mirror the existing services** (`auction/`, `auth/`, `notification/` — each independently deployable, `iac/resource/*.yml` + `iac/iam/*.yml` fragments, domain/interface/service/repository/lambda layering).

**Open architectural question raised 2026-08-16, not yet decided:** transcoding inside Lambda hits hard ceilings — 15-minute max execution, 10 GB memory, 10 GB `/tmp`, and ffmpeg has to ship as a layer or container image. Fine for short clips; it will not survive a feature-length upload. **AWS Elemental MediaConvert** is the purpose-built managed alternative and still counts as serverless. A middle path is chunked transcoding (split → parallel Lambdas → concatenate). Decide this before building the transcode workers.

A frontend was also scoped just before this: React SPA on S3 + CloudFront (OAC, private bucket), Route53-ready.

## Decisions settled 2026-08-16

- **Five domains**, not four: `auth/`, `upload/`, `transcode/`, `notification/`, `web/`. `transcode` is split from `upload` because ffmpeg needs **container-image packaging** while everything else is an esbuild zip — one Serverless service cannot cleanly do both, and they deploy on different cadences. `auction/` is retired once `upload/` works.
- **Transcoding: Lambda + ffmpeg**, capped at roughly **15 min / 2 GB**. Not MediaConvert yet. Structure the workers so the hybrid (each worker *submits* a MediaConvert job instead of encoding) is a drop-in swap — that removes all limits while keeping the fan-out. Key insight: **with MediaConvert the 900 s Lambda ceiling is irrelevant**, because the Lambda only submits and exits. For ffmpeg the binding constraint is usually **`/tmp` (10 GB, holds source AND output)**, not the clock.
- **Auth: Cognito User Pool only — NO Identity Pool, no STS in the browser.** Uploads use a **presigned PUT URL** signed by the Lambda's execution role. A presigned URL is a capability (one method, one key, one expiry), not a credential, so it is *more* restrictive than handing the user an assumed role. Tenant isolation therefore rests on one absolute rule: **derive the S3 key from the verified JWT claim, never from request input.** If that ever feels too thin, the principled alternative is Identity Pool + **ABAC principal tags** (`${aws:PrincipalTag/sub}`), which avoids the identityId-vs-sub mismatch — revisit only if the 2 GB cap is lifted and browser multipart becomes necessary.
- **Delete the custom Lambda authorizer.** Use API Gateway's built-in `COGNITO_USER_POOLS` authorizer: no code, no per-request Lambda, and it makes the flat-context bug structurally impossible. Drops `jsonwebtoken` + `jwks-rsa`.
- **Both sign-in doors**: Google social *and* email/password, so `login.ts` / `register.ts` stay.
- **Job sort key is a ULID, not a UUID** — `JOB#<ulid>` sorts by creation time, so "newest 20 jobs" is `ScanIndexForward: false, Limit: 20`. A random UUID would force reading the user's whole partition. Chosen for the million-user target; changing it later is a migration.
- **Scale dials** for 1M users: `maximumConcurrency` on each SQS event source mapping plus reserved concurrency on API functions (so transcoding cannot starve the dashboard); cost is the real ceiling at ~$0.15/rendition; SES needs a sending-limit increase beyond the 50k/day post-sandbox default.

## Built 2026-08-16 — auth service (A2 + A4 done, not deployed)

`auth/` now owns: `CognitoUserPool` (email as username, OAuth code flow + PKCE, no client secret), `CognitoUserPoolDomain` (Hosted UI, prefix `auth-<stage>-<accountId>`), **`AppTable`** (the single table, `PK`/`SK`, PAY_PER_REQUEST, `DeletionPolicy: Retain`, physical name **`app-<stage>`**), a native `CognitoAuthorizer` (`AWS::ApiGateway::Authorizer`, type `COGNITO_USER_POOLS`), and `GET`/`PATCH /me` backed by `ProfileService` + `ProfileRepository`. `cors: true` on every route. Profile is a **lazy upsert on first `GET /me`** with `attribute_not_exists(PK)` so concurrent first-requests cannot double-write.

`iac/resource/GoogleIdentityProvider.yml` is **written but deliberately not referenced** in serverless.yml — enabling it needs the Google OAuth client (user's job) plus two SSM parameters; the file header lists the three steps.

**`auction/` untouched and flagged LEGACY** via a banner at the top of its README. `auth`'s custom `authorizer` function is kept solely because auction reaches it by constructed ARN; delete both together.

**Two replacement hazards, both flagged in-file:** changing the pool's `UsernameAttributes` after deploy **replaces the User Pool** (all users lost), and renaming `AppTable`'s `TableName` **replaces the table**. Settle both before the first deploy.

**Social login completed 2026-08-16 (A2 done).** Google **and** Facebook identity providers, plus the email/password door, all wired.

- **Cognito does NOT merge accounts by email.** A Google sign-in creates a separate user `Google_<subject>` with its own `sub`, even when a native email/password user exists at the same address — one human, two profiles, two job lists. Fixed with a **PreSignUp Lambda trigger** (`IdentityLinkService`) that calls `AdminLinkProviderForUser` to link the federated identity onto the existing native user. This is the standard Cognito account-linking pattern and is *not* optional when offering both doors.
- **Providers are conditional on SSM.** `iac/resource/{Google,Facebook}IdentityProvider.yml` carry `Condition: HasGoogle` / `HasFacebook`, driven by `${ssm:/auctionize/<stage>/<provider>/client-id, ''}`. The stack packages and deploys with zero credentials; adding the SSM parameters and redeploying switches a provider on with no code change. `SupportedIdentityProviders` is built with `Fn::Split`/`Fn::Sub`/`Fn::If`, and the client `DependsOn` both providers (CloudFormation ignores a DependsOn whose target Condition is false).
- **Circular-dependency trap:** the pool references the PreSignUp function via `LambdaConfig`, so **nothing that function touches may reference the pool.** Cognito env vars were moved from `provider.environment` to per-function, the trigger reads the pool id from `event.userPoolId`, and its IAM uses `userpool/*` rather than `!GetAtt`. Verified by walking the generated template's Ref/GetAtt/DependsOn graph for cycles — worth re-running after any Cognito change, since CFN only reports cycles at deploy time.
- **Bug fixed in `register`:** it called `resendConfirmationCode` immediately after `signUp`, sending a second confirmation email that invalidated the first link — so the only working link was in the mail that looked like a duplicate.
- Federated users are auto-confirmed **before** the email guard, otherwise a Facebook phone-signup (no email returned) is left unconfirmed and can never sign in. `autoVerifyEmail` is set only when an address actually arrived.
- Link failures are deliberately **not** swallowed: a silent duplicate account is harder to detect and undo than a visibly failed sign-in.

Verified: tsc + `sls print` + `sls package` green for auction and auth; generated CFN confirmed to contain OPTIONS preflight on all paths and `COGNITO_USER_POOLS` only on `/me`; packaged bundle executed — `getMe`/`updateMe` reach DynamoDB and an invalid body returns a 400 from class-validator. `notification/` still red for the original pre-existing reason.

## Built 2026-08-17 — `web/` service, and the identity policy settled

**`web/` now exists** — React 19 + Vite + Tailwind v4 SPA, Cognito hosted UI, authorization-code flow with **PKCE** (`GenerateSecret: false`, so PKCE is the only proof the app started the login). Private S3 bucket + CloudFront **OAC**, `403/404 → /index.html` so `/callback` deep-links resolve. Scope is **auth-only** — the user explicitly said to treat `auction/` as legacy and not factor it in. Tokens in `sessionStorage`; the honest limit (no BFF, so XSS-readable) is documented in `web/README.md`.

**Config crosses services at BUILD time, not deploy time.** A static SPA has no runtime config channel, so `web/scripts/pull-config.mjs` reads the auth stack's CloudFormation outputs into `.env.local` before `vite build`. Consequence: `sls deploy` in `web/` does **not** pick up a changed pool — only a rebuild and re-upload does. `auth` gained four `Outputs` for this (`CognitoUserPoolId`, `CognitoClientId`, `CognitoHostedUiUrl`, `ApiUrl`).

**The deploy is a three-step loop and step 3 is not optional:** auth → web → SSM (`/auctionize/<stage>/web/url`) → **auth again**. Cognito refuses a callback URL it wasn't told about, but the CloudFront URL doesn't exist until web deploys, and no CloudFormation import crosses that ordering. `auth/iac/urls.cjs` resolves + **dedupes** the callback list (Cognito rejects duplicates, which naive inline YAML would produce on the SSM fallback). Skipping step 3 fails only in the deployed site while `npm run dev` works — a confusing failure mode.

### Identity decisions settled 2026-08-17

- **Facebook DROPPED and removed.** Meta's Graph API exposes **no email-verification signal at all**, and a Facebook account can carry no email. Neither the linking rule nor the notification pipeline could be applied to one. With one provider, `SupportedIdentityProviders` collapses from `Fn::Split`/`Fn::Sub`/`Fn::If` to a plain `!If [HasGoogle, [COGNITO, Google], [COGNITO]]`.
- **Linking KEPT, not blocking.** The user initially wanted "one email, one sign-in method, block the second" (their ecommerce `registerSource`/`oauthId` model). After weighing it they chose to keep `AdminLinkProviderForUser`. The argument that landed: blocking creates permanent lockouts, and the real risk in linking is an *unverified* provider email, which is fixed by verifying rather than banning.
- **`email_verified` gate added — this is load-bearing.** Linking on an unverified address is an account-takeover primitive. `email_verified: email_verified` is now in Google's `AttributeMapping`, and the trigger returns early unless `userAttributes.email_verified === "true"` (Cognito delivers mapped attributes as **strings**). **Fails closed:** if the mapping ever stops populating, sign-in creates a separate account rather than silently linking. Not yet confirmed against real AWS that Cognito accepts this mapping for `ProviderType: Google`.

### Two replacement hazards — corrected, and one is worse than previously recorded

- **`AppTable` is SAFER than feared.** It carries `DeletionPolicy: Retain` **and** `UpdateReplacePolicy: Retain`, so renaming `TableName` orphans the old table with data intact and creates a new empty one. A migration, not a loss.
- **`CognitoUserPool` has NO `DeletionPolicy`.** Changing `UsernameAttributes` after deploy genuinely **deletes the pool and every user**, with no orphan to recover from. This is the real one-way door.
- Two mutable improvements offered and **not yet applied**: `DeletionPolicy: Retain` on the pool, and `UserAttributeUpdateSettings: { AttributesRequireVerificationBeforeUpdate: [email] }` (currently absent — without it a user changing their email moves the sign-in identifier *before* the new address is verified; a typo locks them out, a deliberate one is a hijack vector).
- **`UsernameAttributes: [email]` does not make the email the literal username.** Cognito assigns an internal UUID and treats email as the sign-in identifier — which is *why* users can change their email later.

### Resolved later on 2026-08-17 — all four closed

The four items below were open when this section was written; a second session
the same day closed every one. **The app also moved**: `auth/` and `web/` now
live in `newEra/auxiliary`, which is the real application, and this repo keeps
only `auction/` + `notification/`. Read
[[auxiliary-is-the-app-auctionize-is-legacy]] for the split and the current
hand-off state — it supersedes the four points here.

1. **Table name → `auxiliary-<stage>`.** Settled by the rename.
2. **Pool settings → APPLIED.** `DeletionPolicy: Retain` **and**
   `UpdateReplacePolicy: Retain` on `CognitoUserPool` (the pair matters: the
   first covers stack deletion, the second covers an immutable-property edit,
   which is the likelier accident), plus
   `UserAttributeUpdateSettings.AttributesRequireVerificationBeforeUpdate:
   [email]`. Retain buys a *migration*, not a rescue — Cognito never releases
   password hashes, so users of an orphaned pool must reset their passwords.
3. **Deploy authorization → GRANTED for `auth` + `web`, still NOT RUN.**
4. **Google OAuth client → DONE by the user.** Both SSM parameters exist
   (`client-id` String, `client-secret` SecureString), `HasGoogle` resolves true,
   and the generated CFN was confirmed to contain the provider resource,
   `SupportedIdentityProviders → [COGNITO, Google]`, the `DependsOn`, and the
   `email_verified` mapping. The Cognito domain stayed
   `auth-dev-755352605221.auth.us-east-1.amazoncognito.com` on purpose, so the
   registered redirect URI keeps working.

Living plan: **The Rendition Ladder** — https://claude.ai/code/artifact/83368ddf-ab58-41fe-b055-463780d44ad1
Auth identity model: **Two Kinds of Cognito** — https://claude.ai/code/artifact/a7bad5df-0e41-4d2a-b1c6-f0c1ad8d2786
auth + web walkthrough: **Two Doors, One Sub** — https://claude.ai/code/artifact/aec37e9f-62e4-49f3-8ca1-ea550bec6b36

See also [[auctionize-job-and-quota-data-model]] for the upload/quota schema planned this session.
