---
name: auxiliary-is-the-app-auctionize-is-legacy
description: "2026-08-17 split: auth/ and web/ moved out of auctionize into newEra/auxiliary, which is now the real application; what got renamed, what deliberately did not, and the exact state the next session starts from."
metadata: 
  node_type: memory
  type: project
  originSessionId: 08b29a41-ce9e-4f7e-97a3-2af672a8bc31
  modified: 2026-08-17T22:29:45.675Z
---

**Split on 2026-08-17, at the user's instruction.** The application is now
`newEra/auxiliary` — they named it while answering the "what should the DynamoDB
table be called" question: *"call it auxiliary. that is going to be the
application name."* Then they ended the session to reopen it from that folder.

⚠️ **Spelling was flagged and not corrected.** The standard English spelling is
**auxiliary**; the user wrote **auxiliary** and that is what is on disk, in the
table name, and in the SSM paths. Deliberate fidelity to the instruction, not a
typo of mine. Nothing is deployed, so renaming is still free — offer it once,
early, then drop it.

## What is where now

- **`newEra/auxiliary/`** — `auth/`, `web/`, a copied `.claude/`, `.gitignore`.
  Moved with `node_modules` intact, so nothing needs reinstalling.
- **`newEra/auctionize/`** — keeps `auction/`, `notification/`, `.vscode/`, its
  `.claude/`, and **the `.git`**. Its working tree now shows `auth/` and `web/`
  as deleted, **uncommitted**. Left that way on purpose: committing a deletion
  of their own work is the user's call, not mine.

**⚠️ `auxiliary/` is under NO version control at all.** `git init` + a first
commit is the single most important thing to do at the start of the next
session. The *committed* state of auth/web is still recoverable from
auctionize's history at `6e1e561`, but everything from 2026-08-17 — the Facebook
removal, the `email_verified` gate, the pool hardening, the rename — exists only
as untracked files in one directory.

**The global skill symlinks still work.** `~/.claude/skills/{add-lambda,
add-aws-resource,deploy-auctionize}` point into `auctionize/.claude/skills/`,
which is why `.claude` was **copied rather than moved**. Both folders load
memory from `~/.claude/memory/newEra` and both carry the `sls deploy`/`sls
remove` ask-list. The skills still say "auctionize" throughout — they describe
the same code, so they are accurate in substance; retarget the symlinks and the
wording at `auxiliary` when convenient. See
[[auctionize-has-its-own-claude-setup]].

## Renamed, and what was deliberately NOT

A blanket `auctionize` → `auxiliary` rename was applied across the moved tree:

- **DynamoDB table `auxiliary-${stage}`** (was `app-${stage}`) — this settles the
  open table-name question in [[auctionize-job-and-quota-data-model]].
- **SSM namespace `/auxiliary/<stage>/...`** — Google credentials and the web URL.
- `sessionStorage` keys `auxiliary.session` / `auxiliary.pkce.*`, page `<title>`
  and the `<h1>` on Home.

**Serverless service names were left alone: `service: auth` and `service: web`.**
This is load-bearing, not an oversight. The Cognito hosted-UI domain is
`${self:service}-${stage}-${accountId}`, so renaming the service would move the
domain and **silently invalidate the redirect URI already registered in the
Google console**. The domain stays:

```
auth-dev-755352605221.auth.us-east-1.amazoncognito.com
redirect URI: https://auth-dev-755352605221.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

## SSM: copied, not moved

`/auxiliary/dev/google/client-id` (String) and `client-secret` (SecureString) were
copied from the `/auctionize/dev/...` originals, which were **left in place**.
Additive, so a failed copy could not have broken anything. The value passed
through a shell subshell and was never printed. Delete the `/auctionize/` pair
once a deploy has proven the new path works.

## State at hand-off — all verified, nothing deployed

`auth`: `tsc --noEmit` ✅, `sls package --stage dev` ✅. `web`: `tsc --noEmit` ✅.
Generated CloudFormation confirmed to contain `TableName: auxiliary-dev`, both
Retain policies on the table **and** on the pool,
`AttributesRequireVerificationBeforeUpdate: [email]`, `HasGoogle` resolving to
the real client id, the `GoogleIdentityProvider` resource, and
`SupportedIdentityProviders → [COGNITO, Google]`.

**The user authorized a full `auth` + `web` deploy to account 755352605221 in
this session, and it was never run** — the folder move landed in the same answer
and took priority. Treat that authorization as still standing, but re-confirm,
since it predates the move.

## ⚠️ UPDATED 2026-08-18 — most of the below is now DONE

Items 2 and 3 of the old plan are complete. **`auth` and `web` are deployed** to
755352605221 (`auth-dev`, `web-dev`, both healthy), all three SSM parameters
exist including `/auxiliary/dev/web/url`, and the legacy custom authorizer is
gone along with `security.service.ts`, the authorizer interfaces, `jsonwebtoken`
and `jwks-rsa`. Live endpoints:

```
API   https://iskpmxzkcj.execute-api.us-east-1.amazonaws.com/dev
UI    https://auth-dev-755352605221.auth.us-east-1.amazoncognito.com
site  https://d88xibvknol3i.cloudfront.net   (dist E3EQ01RB3IJ6EO)
pool  us-east-1_H8C1OZa6z    client 2sh3e39f828oli44glkqjhqvdu
```

What actually remains, in order:

1. **`git init` + first commit — STILL NOT DONE.** Everything since 2026-08-17
   exists only as untracked files. This is still the single most valuable
   first action.
   ⚠️ **Before the first commit: rotate the Google client secret.** The user
   pasted the live `GOCSPX-…` value into `README.md`. I redacted it to `'...'`
   when repairing that file and told them, but the credential itself has not
   been rotated and must not enter git history.
2. **Deploy `web`** — the redesigned SPA is built and verified but *not*
   published; live bundle hash still differs from `dist/`. `cd web && npm run deploy`.
3. **Deploy `core`** — scaffolded and verified, never deployed. See
   [[auxiliary-core-service-scaffolded]].
4. **The upload pipeline**, blocked at step 4 on MediaConvert. See
   [[auxiliary-upload-pipeline-plan]] and
   [[auxiliary-free-plan-blocked-four-services]].

The third service is called **`core/`**, not `upload/`.

## One sharp edge worth knowing

`${ssm:...}` resolves at **package** time, so the Google **client secret sits in
plaintext** in `.serverless/cloudformation-template-update-stack.json`, gets
uploaded to the Serverless deployment bucket, and is readable in the
CloudFormation console's Template tab. SecureString protects it at rest in
Parameter Store and nowhere after that. Acceptable for a personal dev account;
the CFN-native fix is a `{{resolve:ssm-secure:...}}` dynamic reference, which
resolves at deploy time — but that only works on an allowlist of resource
properties and **it was NOT confirmed that Cognito's `ProviderDetails` is on it.**
Verify before promising it.

Related: [[auctionize-real-goal-is-transcoding-template]],
[[auctionize-job-and-quota-data-model]],
[[auctionize-deploys-as-default-profile]],
[[auctionize-is-serverless-aws-no-local-stack]].


## 2026-08-18 — the auxilary -> auxiliary rename, COMPLETE

The user chose to fix the spelling everywhere. 31 occurrences across 15 files,
plus the root folder, now `newEra/auxiliary`. All three services deployed and
verified afterwards; `core` deployed for the first time (`core-dev`, endpoint
`https://insjoacrx2.execute-api.us-east-1.amazonaws.com/dev/uploads`).

**The table was migrated, not renamed** — `TableName` forces replacement. New
empty `auxiliary-dev` created, old `auxilary-dev` retained then deleted on the
user's instruction; its 2 PROFILE rows were discarded deliberately, which costs
nothing because `getMe` creates the row on first read (`profile.service.ts:17`).

**A NEW Google OAuth client was registered** and its creds put at
`/auxiliary/dev/google/{client-id,client-secret}`. The old `/auxilary/*` params
are deleted, so the secret that leaked into README.md is dead — README is now
safe to commit. Verified end to end by following the Cognito authorize endpoint
to Google and confirming no `redirect_uri_mismatch`.

**Service names were still left as `auth`/`web`/`core`**, so the Cognito domain
`auth-dev-755352605221.auth.us-east-1.amazoncognito.com` never moved and the
Google redirect URI `<that domain>/oauth2/idpresponse` stayed valid throughout.
That is the reason the rename was cheap; keep it that way.

⚠️ Still uncommitted at hand-off, mixed with four earlier edits to
`profile.service.ts`, `middify.ts`, `presentation.ts`, `validation.ts`.
