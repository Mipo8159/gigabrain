---
name: auctionize-job-and-quota-data-model
description: "The planned single-table schema for uploads, jobs and upload quota — and why quota must never live in Cognito."
metadata: 
  node_type: memory
  type: project
  originSessionId: 00f00d81-416e-4d89-8e03-0acb3a33af7d
  modified: 2026-08-17T09:43:55.035Z
---

**Table name SETTLED 2026-08-17: `auxiliary-<stage>`** (was the placeholder
`app-<stage>`), when the app was renamed and split out — see
[[auxiliary-is-the-app-auctionize-is-legacy]]. Everything below is unchanged.

Planned 2026-08-17, **not yet built**. The product shape the user finally stated:
unregistered visitors get a welcome page + ads; signed-in users get an upload
button and a list of their own jobs with statuses; each user carries a **number
of upload permissions (quota)**, a status, and later **subscriptions**.

## Quota must NOT live in Cognito

The user's instinct was "a user table becomes a necessity, so we'll need a user
pool." Those are different things. Cognito custom attributes are a trap here:

- **Immutable schema** — a custom attribute can never be deleted or retyped, ever.
- **No atomic operations** — no conditional update, no counter decrement. Two
  tabs both read "3 remaining" and both proceed.
- **Stale in the token** — a value riding in the JWT is frozen for the token's
  lifetime, so the UI shows spent credits as available for up to an hour.

A quota is a transactional counter. Cognito cannot do transactions; DynamoDB can.

**Split:** Cognito owns authentication (`sub`, password, MFA, Google link).
DynamoDB owns everything else about the user. `sub` is the join key.

## The schema

```
PK              SK           attrs
USER#<sub>      PROFILE      email, registerSource, plan, status,
                             uploadsRemaining, quotaPeriodStart, createdAt
USER#<sub>      JOB#<ulid>   status, sourceKey, sizeBytes, durationSec,
                             createdAt, completedAt, sourceDeletedAt,
                             outputs: { "480": {...}, "720": {...}, "1080": {...} }
USER#<sub>      SUB#<ulid>   (later) plan, startedAt, endsAt, providerSubId
```

- **Renditions as a nested map, not separate items** — three fixed renditions,
  written together on completion, nowhere near the 400 KB item limit.
- **Active plan denormalized onto PROFILE** — the quota check runs on every
  upload and must not read two items. Real cost: two places to update.
- **GSIs needed today: none.** Later, a *sparse* `GSI1PK = STATUS#<status>`
  written only while a job is non-terminal, so finished jobs fall out for free.

## Quota decrement: the part that is easy to get wrong

Both obvious timings are wrong. Decrementing at presign burns a credit on an
abandoned upload; decrementing on S3-completion lets a user request 50 presigned
URLs at once and bypass the quota entirely.

Decrement at presign, and make it **one atomic write**:

```
TransactWriteItems([
  Update PROFILE  "uploadsRemaining -= 1"  ConditionExpression: uploadsRemaining > 0
  Put    JOB#<ulid> status=PENDING_UPLOAD  ConditionExpression: attribute_not_exists(PK)
])
```

Both or neither; the condition is what makes concurrent tabs safe (second one
fails cleanly → 402). Give `PENDING_UPLOAD` jobs a **TTL**, and refund the credit
from the stream handler when one expires. Costs nothing when uploads succeed.

## Presigned upload rules

- **Derive the S3 key from the verified JWT claim, never from request input** —
  `uploads/${claims.sub}/${ulid()}/source.mp4`. This is the whole tenant-isolation
  story under the no-Identity-Pool decision.
- **Bound the size.** Client sends `sizeBytes`, server validates against the plan,
  then signs `Content-Length` as a required header so S3 rejects anything else.
  (Presigned POST with `content-length-range` is the more flexible variant.)
  An unbounded presigned PUT is where the storage bill escapes.
- Video **cannot** pass through the API: API Gateway caps a request at 10 MB and
  Lambda a payload at 6 MB. Direct-to-S3 is mandatory, not an optimisation.

## Why DynamoDB and not Aurora/DSQL

The user asked "this seems relational but I want serverless — be honest."
Their *relationships* are relational; their *queries* are not. Every access
pattern starts "for this one user…" — a hierarchy, not a graph.

Named honestly as the places DynamoDB will hurt: admin "all failed jobs" needs a
GSI; anything analytical ("which plan tier uses 1080p most") is impossible at any
price and belongs in S3 export + Athena, not a schema change; unanticipated
queries mean a new index. **Aurora DSQL** is the real serverless-relational answer
if reporting ever becomes a product feature — but it drags in nothing this app
needs today, and the quota is one `UpdateItem`.

## Deferred, deliberately

Quota numbers, plan tiers, subscription model, storage lifecycle (originals →
Glacier/delete, hence the `sourceDeletedAt` field reserved now), custom domain.
None of them touch `auth` or `web`.

**Quota reset semantics undecided:** counter reset on a schedule vs an auditable
ledger. Start with the counter plus `quotaPeriodStart` so migrating to a ledger
stays possible once money is involved.

Related: [[auctionize-real-goal-is-transcoding-template]],
[[auctionize-deploys-as-default-profile]].
