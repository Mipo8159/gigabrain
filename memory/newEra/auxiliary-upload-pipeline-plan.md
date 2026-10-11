---
name: auxiliary-upload-pipeline-plan
description: "The agreed 7-step plan for auxiliary's video upload/transcode pipeline, the still-open one-job-vs-three-queues decision, and the MediaConvert cost facts that make it a design rather than a cost question."
metadata: 
  node_type: memory
  type: project
  originSessionId: ae2d0a4b-78f7-4f20-adb5-7dc3bc21e90d
  modified: 2026-08-17T22:28:14.745Z
---

The user's own sketch, 2026-08-18: source bucket → SNS topic → **3 SQS queues**
(480/720/1080) → **3 Lambdas** → MediaConvert. `core/` is the service that will
hold it — see [[auxiliary-core-service-scaffolded]].

## The open decision — do NOT build past step 4 without settling it

**Three separate MediaConvert jobs (their sketch) vs one job with three
outputs.** I recommended **one job, three outputs**; they have not decided.

| | 3 jobs | 1 job, 3 outputs |
| --- | --- | --- |
| Input decoded | 3× | 1× |
| Renditions ready | incrementally, 480p first | together |
| Retry granularity | per rendition | whole job |
| **ABR / HLS ladder** | **impossible** — 3 standalone files | native |
| Moving parts | topic + 3 queues + 3 DLQs + 3 fns | 1 queue + 1 DLQ + 1 fn |

**It is not a cost decision.** MediaConvert bills per **output** minute
($0.0075/min, verified via Price List API: SD *and* HD, H.264, ≤30fps,
single-pass, Basic tier), so three renditions cost the same either way. Cost
neutrality argues for the simpler shape.

**The real cost lever is eagerness, not fan-out.** Transcoding all three
renditions on every upload is the most expensive shape available:
1,000 uploads × 10 min → **$225/mo** all-three-eagerly vs **$75/mo** for 720p
eager and the rest on demand. Most uploads are never watched at every
resolution. If they ever want lazy renditions the trigger changes from "upload
event fans out" to "playback request may trigger" — worth raising before the
fan-out is built.

MediaConvert is ~**4.6× raw Fargate/ffmpeg compute**; fine at 100 uploads/mo
($22), worth revisiting near 10,000 ($2,250).

## Steps — each independently deployable and verifiable

| # | Step | Done when |
| --- | --- | --- |
| 0 | Enable MediaConvert | `describe-endpoints` returns a URL — **BLOCKED**, see [[auxiliary-free-plan-blocked-four-services]] |
| 1 | Source + destination buckets, CORS, lifecycle | `aws s3 cp` into source works |
| 2 | `POST /uploads` → presigned URL + `JOB#` item (`queued`) | Browser uploads; row appears |
| 3 | S3 notification → SNS → **one** SQS queue + DLQ | `receive-message` shows the event |
| 4 | MediaConvert service role + one Lambda submitting one job | Output file appears in destination |
| 5 | EventBridge on job state change → update `JOB#` status | `GET /uploads` shows `done` unaided |
| 6 | Remaining renditions | Three per upload |
| 7 | Transcription | Transcript stored and retrievable |

Steps 1–3 need nothing from MediaConvert. **Build one rendition end to end
before fanning out** — step 5 is where these pipelines usually break, and it is
far easier to debug one path than three.

## Pieces the user's sketch omitted

1. **A destination bucket** — they named only the source.
2. **MediaConvert's own IAM service role** (assumed by the service, *not* the
   Lambda's role) — the most common first-time failure.
3. **Completion handling — the real gap.** `CreateJob` returns in ms; the render
   takes minutes. Without an EventBridge rule on job state change, `status` is
   stuck at `queued` forever and nothing ever marks a job done.
4. **Who writes the `JOB#` row, and when** — a user who abandons the upload
   leaves an orphan.
5. **Idempotency** — SQS is at-least-once; a redelivered message submits a
   duplicate MediaConvert job.
6. **DLQs** on every queue.
7. **Transcription** is half the product and absent from the sketch.

## CloudFormation trap in step 3

S3 bucket notification needs the SNS topic ARN, and the topic policy needs the
bucket ARN — a circular dependency CFN refuses. Same shape as the auth↔web
callback-URL problem `iac/urls.cjs` solves. **Fix: construct the bucket ARN from
its known name** (`arn:aws:s3:::auxiliary-source-${stage}`) in the topic policy so
only one real dependency exists. `!GetAtt` in both directions will not deploy.

## Skip the MediaConvert CFN resource types

`AWS::MediaConvert::Queue` / `::JobTemplate` / `::Preset` exist, but there is a
**Default queue** and job settings can be built inline in the Lambda — versioned
with the code that submits them, reviewable in a diff, changeable without a
stack update. That leaves the IAM service role as the only MediaConvert-shaped
thing in the template. Reach for `::Queue` only for reserved pricing or job
isolation, neither of which applies yet.

Related: [[auxiliary-free-plan-blocked-four-services]],
[[auxiliary-core-service-scaffolded]], [[auctionize-job-and-quota-data-model]].

## ⚠️ UPDATED 2026-08-18/19 — the open decision is SETTLED, steps 1–2 shipped

**The 480/720/1080 rendition ladder is gone.** Renditions were replaced by
**purposes** — Instagram *placements*, each a different aspect ratio, not a
quality tier: `reel` 9:16 1080x1920, `story` 9:16 (60s per card, split not
truncated), `post` 4:5 1080x1350, `cover` 3:4 1080x1440 (Instagram moved the
grid to 3:4 in Jan 2026). Documented in `core/src/interface/job.interface.ts`.

**Decision: ONE MediaConvert job, one output per selected purpose.** The
three-queue fan-out from the original sketch is dead. Purposes are multi-select
on the DTO; three jobs would decode the source three times for an identical
result. The table above is retained only as the record of why.

`mediaKind` (`image` | `video`) is derived from Content-Type, never asked:
images are resized inside the Lambda in ms, only video goes to MediaConvert.

**Step 0 UNBLOCKED** — `aws mediaconvert describe-endpoints` returns
`https://mediaconvert.us-east-1.amazonaws.com`. See
[[auxiliary-free-plan-blocked-four-services]].

**Steps 1 and 2 are DONE and DEPLOYED** (`core-dev`, UPDATE_COMPLETE
2026-08-18 15:39Z, commit `e033209` "carves upload paths"):
- `core/iac/resource/MediaBuckets.yml` — `core-source-dev-755352605221` and
  `core-output-dev-755352605221`, CORS from `iac/origins.cjs`.
- `POST /uploads` → `CreateUploadDTO` (1 GB cap, video/image MIME, ≥1 purpose)
  → ULID job row → presigned PUT. The file never touches Lambda; API Gateway
  caps a body at 10 MB.
- Bucket names live in `custom.media` as **literal strings, not `!Ref`** —
  precisely to break step 3's topic-policy/notification cycle described above.
- `sourceKeyFor()` → `uploads/<sub>/<jobId>/source<ext>`, with `parseSourceKey`
  already written for step 3. The key carries PK and SK so the consumer does a
  GetItem, not a scan.
- New status `awaiting-upload` precedes `queued`, so an abandoned upload is
  distinguishable from work genuinely waiting. Step 3 promotes it.

**Next: step 3.** Source bucket is still empty — nothing has been uploaded
through the presigned URL yet, and `web/src/pages/` has no upload page (only
Home/SignIn/Callback), so the endpoint has no client.

## Step 3 BUILT 2026-08-19 — verified, NOT deployed

`core` gained `iac/resource/UploadEvents.yml` (topic, topic policy, queue, DLQ,
queue policy, subscription), a `NotificationConfiguration` on `SourceBucket`,
and `ingestUpload` on `events: sqs`. `npm run verify` green, probe **5**.
**`npm run deploy` was BLOCKED by the auto-mode classifier** — it is on the
ask-list. Nothing is live; the deploy is the only outstanding action.

Decisions worth not re-deriving:

- **SNS kept despite one queue.** A bucket's NotificationConfiguration is a
  bucket property, so each new consumer would be a bucket edit. Step 7's
  transcription consumer just subscribes instead.
- **`DependsOn: UploadTopicPolicy` on SourceBucket is mandatory.** S3
  test-publishes when a notification is configured; without the ordering the
  stack fails with "Unable to validate the following destination
  configurations" — and it is a race, so it can pass once and fail next time.
- **`RawMessageDelivery: true`** on the subscription — otherwise the SQS body
  is an SNS envelope whose `Message` is itself a JSON string (double parse).
- **Do NOT hand-write the SQS consumer IAM statement.** Serverless v4 adds
  Receive/Delete/GetQueueAttributes to the *per-function* role automatically
  for `events: sqs`. I wrote one, it produced a duplicate statement, deleted it.
- **Idempotency = one conditional UpdateItem** guarded on
  `status = "awaiting-upload"`, with `ReturnValuesOnConditionCheckFailure:
  ALL_OLD` to separate "already moved on" (error carries `Item`) from "no such
  job" (no `Item`) in a single call. `status` is a DynamoDB reserved word.
- **`IngestService` is separate from `UploadService` on purpose** — HTTP
  services return status codes, queue services must let throws escape so SQS
  retries. Same aggregate, opposite error contracts.
- Settled-not-failed outcomes (never reach the DLQ): unparseable key, orphaned
  object, and S3's one-off `s3:TestEvent`, which has no `Records`.
- **Size gate at ingest**: a presigned PUT is signed over key + Content-Type,
  NOT byte count, so the DTO's 1 GB cap is breakable. Ingest marks oversized
  jobs `failed`. The real fix (pin `ContentLength` into the signature) is
  noted in core/README.md as a known limit, not done.

Nothing watches the DLQ yet — a CloudWatch alarm on
`ApproximateNumberOfMessagesVisible > 0` is the missing piece.
