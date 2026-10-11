---
name: auxiliary-core-service-scaffolded
description: "auxiliary gained a third service, core/, on 2026-08-18: how it borrows auth's pool and table without duplicating either, why ${cf:} beats Fn::ImportValue here, and the util/ duplication that is now on the clock."
metadata: 
  node_type: memory
  type: project
  originSessionId: ae2d0a4b-78f7-4f20-adb5-7dc3bc21e90d
  modified: 2026-08-17T22:28:35.610Z
---

**`newEra/auxiliary/core/`** — added 2026-08-18 at the user's request ("spin
another sls directory, call it core… structurally similar to auth. bare bones
for now"). It will hold the upload/transcode logic of
[[auxiliary-upload-pipeline-plan]]. The repo is now `auth/` + `core/` + `web/`.

Structurally a copy of `auth`: same hexagonal layout (port + adapter), same
Inversify container, same SWC-via-esbuild build, same `npm run verify` /
`probe` scripts. Verified at hand-off: typecheck ✅, package ✅, probe reports
**3** `design:paramtypes`.

## What it borrows, and the rule that follows

| Thing | Owner | How core reaches it |
| --- | --- | --- |
| Cognito user pool | `auth` | `${cf:auth-${stage}.CognitoUserPoolId}` |
| App table `auxiliary-${stage}` | `auth` declares it | **by name, never redeclared** |
| API Gateway + authorizer | `core` | its own, aimed at auth's pool |

- **`${cf:...}` over `Fn::ImportValue`, deliberately.** A real CFN export *locks*
  the producing stack — once `core` imported auth's pool, `auth` could not change
  that output without deleting `core` first. `${cf:}` reads and copies the value
  at **package** time, so `auth` stays free to evolve. It also gives the
  dependency for free: `core` cannot deploy into a stage where `auth` has not,
  because the lookup fails outright.
- **Never add the table to core's `resources`.** It is the *application's* table
  — `JOB#<ulid>` items share the user partition with auth's `PROFILE` row. Two
  stacks declaring the same physical table would fight over it.
- Authorizers, unlike pools, are cheap to duplicate — one per service, all
  validating against the one pool.

Verified the reference resolves: packaged template contains
`ProviderARNs: ["arn:aws:cognito-idp:us-east-1:755352605221:userpool/us-east-1_H8C1OZa6z"]`.

## The one endpoint

`GET /uploads` → the caller's jobs, newest first. Returns `[]`, but it is a
**real query**, not a stub: `PK = USER#<sub> AND begins_with(SK, "JOB#")`,
`ScanIndexForward: false`. It exercises handler → service → port → adapter →
IAM → authorizer, so the first `JOB#` item written will appear with no code
change. Deliberately built this way rather than faking data.

**Not deployed yet.** `cd core && npm run deploy`.

## Two things on the clock

- **`util/` is copied from auth, not shared** — `middify`, `presentation`,
  `validation`, verbatim in two services. Fine at two; at four it wants an npm
  workspace. Decide before the copies drift.
- **Widening `ListJobsIAM` is the easy mistake.** `POST /uploads` needs its own
  statement; adding `PutItem` to the existing one silently gives the read-only
  list handler write access.

Related: [[auxiliary-upload-pipeline-plan]],
[[auxiliary-is-the-app-auctionize-is-legacy]], [[auctionize-di-is-inversify-via-swc]].
