---
name: auctionize-deploys-as-default-profile
description: "Which AWS identity auctionize deploys with, and that no profile is pinned anywhere in the repo."
metadata: 
  node_type: memory
  type: project
  originSessionId: 00f00d81-416e-4d89-8e03-0acb3a33af7d
  modified: 2026-08-16T18:38:19.675Z
---

auctionize has **no `profile:` in any `serverless.yml`** and no `AWS_*` env vars
are set, so every `sls` command falls through to the `[default]` profile in
`~/.aws/credentials`.

As of 2026-08-16 that resolves to:

- account `755352605221`
- IAM user `iamadmin`
- identical access key to the `finrod` profile (`...KWWP`)

**Why:** nothing in the repo states the target account, so a wrong `[default]`
would deploy to the wrong place silently — `sls` reports success either way.

**How to apply:** confirm the account with `aws sts get-caller-identity` before
any deploy the user authorizes, and name the account back to them. If they want
it pinned, `provider.profile: ${opt:profile, 'default'}` is the change.

Related: [[auctionize-is-serverless-aws-no-local-stack]].
