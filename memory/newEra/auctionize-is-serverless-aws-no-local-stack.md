---
name: auctionize-is-serverless-aws-no-local-stack
description: "newEra/auctionize is three independent Serverless/Lambda services with no local stack and no tests, so verification is tsc + sls print/package + a bundle probe, and deploying is a confirmed step."
metadata: 
  node_type: memory
  type: project
  originSessionId: 76ef8677-7efe-4340-854b-0fbea459db02
  modified: 2026-08-14T12:57:56.551Z
---

`newEra/auctionize` holds three separately-deployable Serverless Framework v3
services — `auction/`, `auth/`, `notification/` — each with its own
`package.json`, `node_modules`, `serverless.yml` and CloudFormation stack. There
is no root workspace, so every command runs from inside a service directory.
Only `auction/` is a git repo; the folder as a whole is not.

**Why this changes how work is verified:** there is no LocalStack, no
`serverless-offline`, no docker compose, and no test runner or `scripts` block
in any of the three. Code talks to real DynamoDB, Cognito and EventBridge
Scheduler. "Run it" means spending money in AWS.

**How to apply:** climb the ladder and stop at the highest rung that answers the
question — `./node_modules/.bin/tsc --noEmit`, then
`./node_modules/.bin/sls print --stage dev`, then `sls package --stage dev`
(all free and offline), and only then `sls deploy`. Baseline as of 2026-08-13:
`tsc` exits 0 in all three; `sls print` exits 0 for auction and auth and
**exits 1 for notification**, which is an empty scaffold whose `serverless.yml`
references `${self:custom.Authorizer.arn}` with no `custom:` block. That red is
pre-existing — do not chase it as a regression.

**That ladder is not sufficient on its own.** On 2026-08-14 all three rungs were
green while every endpoint in `auction` and `auth` was guaranteed to throw on
first invocation — esbuild silently drops the decorator metadata tsyringe needs.
`tsc` typechecks *source*, `sls package` only proves a bundle was produced;
neither executes it. For anything touching DI, decorators, or the build, add a
rung: bundle with Serverless's own esbuild and actually run the result in node.
Recipe in [[auctionize-esbuild-breaks-tsyringe-di]].

Deploy order is `auth` before `auction`: auction reaches the authorizer by
constructed ARN string (`auth-${stage}-authorizer`), not a CloudFormation
import, so nothing enforces it and a missing auth stack fails silently at
request time instead of at deploy time.

Details live in the three project skills — see
[[auctionize-has-its-own-claude-setup]].
