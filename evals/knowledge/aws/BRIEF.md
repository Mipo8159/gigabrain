# AWS for Node/TypeScript backends (SDK v3): knowledge-eval brief

Slug: `aws`. Researched 2026-10-12 from live AWS docs and by running SDK v3.1150.0 locally
(Node 24.21). If a claim says **(verified locally)**, it was reproduced in a scratch project.

## Mental model

1. Every AWS messaging service delivers **at least once**. Duplicates are normal, so handlers must be idempotent.
2. SQS doesn't push. Lambda's poller borrows each message for a "visibility timeout". If you don't finish in time, someone else gets it.
3. A Lambda batch either succeeds whole, fails whole, or reports exactly which items failed. That third option has to be switched on in config.
4. Many "batch" APIs return HTTP 200 even when some items failed. You must read the per-item result.
5. DynamoDB gives you one table, keys and conditions. Uniqueness and idempotency come from **conditional writes**, not from reads first.
6. DynamoDB reads come back in pages of at most 1 MB. "Limit" counts items *before* your filter, so you loop until there is no `LastEvaluatedKey`.
7. GSIs are copies updated a moment later. They are never strongly consistent and never unique.
8. A presigned URL is a signature over a few chosen fields. Anything not signed can be changed by the client, and anything signed must match exactly.
9. SDK v3 clients are cheap to call and costly to create, so build them once outside the handler and reuse them. Keep-alive is already on.
10. Timeouts and retries are client config (`maxAttempts`, `requestHandler`). The defaults are looser than most people assume.
11. Retries happen at every layer (SDK, Lambda, EventBridge, Step Functions). Know which layer gives up and where the failed item lands (a DLQ).
12. IAM is resource-shaped. Bucket-level and object-level actions take different ARNs, and encrypted queues also need KMS permissions.

## Traps

### 1. SQS visibility timeout shorter than Lambda timeout × 6
- **Mistake:** Leaving the queue at the default 30 s visibility timeout (CDK `new sqs.Queue()` default) while the consumer Lambda has `timeout: Duration.seconds(30)` or more. Or setting it equal to the function timeout. Messages get re-delivered while still being processed, which causes duplicates and early DLQ moves.
- **Correct:** Queue `VisibilityTimeout` ≥ 6 × function timeout + `MaximumBatchingWindowInSeconds`. Set the redrive policy `maxReceiveCount` ≥ 5. Lambda itself only rejects `function timeout > visibility timeout` when the event source mapping is created. The 6× rule is advice that nothing enforces, and CDK `SqsEventSource` does not check it either (checked in aws-cdk-lib 2.273.0 source).
- **Source:** https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- **Testable how:** A CDK app plus `aws-cdk-lib/assertions` `Template.fromStack`. Read `AWS::SQS::Queue.VisibilityTimeout`, `RedrivePolicy.maxReceiveCount`, the function `Timeout` and the ESM `MaximumBatchingWindowInSeconds`, then assert `vt >= 6*timeout + window` and `maxReceiveCount >= 5`. No AWS account needed.
- **LLM likelihood:** **med**. LLMs know "visibility ≥ function timeout" but rarely apply the 6× rule or add the batch window.

### 2. Partial batch failures: config switch, return shape, FIFO ordering
- **Mistake:** (a) Returning `{ batchItemFailures }` without enabling `FunctionResponseTypes: ["ReportBatchItemFailures"]` (CDK `reportBatchItemFailures: true`), so the return value is ignored. (b) Catching per record and then `throw`ing at the end, which fails the whole batch. (c) Pushing `record.body`, `receiptHandle` or `undefined` instead of `record.messageId`. Any null, empty or unknown `itemIdentifier` makes Lambda treat the **whole batch** as failed. (d) On FIFO, carrying on after a failure, which breaks per-group ordering.
- **Correct:** Enable `ReportBatchItemFailures` and never throw from the handler. Return `{ batchItemFailures: [{ itemIdentifier: record.messageId }] }`; an empty list means success. For FIFO, stop at the first failure and report that message **and every message after it** as failed. Alternative: `@aws-lambda-powertools/batch` (`SqsFifoPartialProcessor`).
- **Source:** https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- **Testable how:** Pure unit test on the handler with hand-built `SQSEvent` fixtures (`@types/aws-lambda`). Hidden cases: a failure in the middle of a standard batch reports only that id; a FIFO batch `[ok, fail, ok]` reports ids 2 and 3; the handler never rejects; every reported id is in the input. Add a CDK assertion that `FunctionResponseTypes` contains `ReportBatchItemFailures`.
- **LLM likelihood:** **high** for the FIFO "report the rest" rule and for forgetting the ESM flag. **Med** for the basic shape.

### 3. FIFO deduplication, MessageGroupId, and fair queues on standard queues
- **Mistake:** Thinking content-based dedup covers message attributes. It hashes the **body only**, so two messages with the same body and different attributes collapse into one. Thinking dedup ends once a message is deleted; SQS keeps tracking the id for the full 5-minute window. Thinking that sending `MessageGroupId` to a **standard** queue gives ordering. Since July 2025 that turns on *fair queues* (noisy-neighbour isolation) and gives no ordering.
- **Correct:** FIFO `SendMessage` requires `MessageGroupId`. Use an explicit `MessageDeduplicationId` (for example a business idempotency key) when the body alone isn't the identity. Otherwise set `ContentBasedDeduplication: true`. If neither is set, the send fails. Ordering only exists on FIFO queues, per group.
- **Source:** https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html, https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/providing-message-deduplication-id.html, https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-sqs-introduces-fair/
- **Testable how:** A producer module plus `aws-sdk-client-mock` on `SQSClient`. Assert the `SendMessageCommand` input has `MessageGroupId` set to the tenant/order id and `MessageDeduplicationId` set to a stable hash of the business key (not `Date.now()` or a random UUID). A second call with the same key gives the same dedup id.
- **LLM likelihood:** **med**. A random UUID as dedup id is a common LLM habit, and it defeats dedup completely.

### 4. SNS → SQS fan-out: the envelope and filter scope
- **Mistake:** Doing `JSON.parse(record.body)` in the SQS consumer and treating the result as the payload. Without raw delivery the body is the **SNS envelope** (`Type`, `MessageId`, `Message`, `MessageAttributes`…), and the real payload is the string in `.Message`, which needs a second `JSON.parse`. Also writing a filter policy on body fields without `FilterPolicyScope: "MessageBody"`. The default scope is `MessageAttributes`, so the filter silently matches nothing.
- **Correct:** Either set the subscription attribute `RawMessageDelivery: "true"` (CDK `rawMessageDelivery: true`) and parse once, or unwrap `JSON.parse(JSON.parse(body).Message)`. Pick one and make the consumer and the infra agree. For body filtering, set `FilterPolicyScope: "MessageBody"` (CDK `filterPolicyWithMessageBody`).
- **Source:** https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html, https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering-scope.html
- **Testable how:** Consumer unit test with two fixtures, an enveloped body and a raw body. The CDK assertion checks `AWS::SNS::Subscription` has `RawMessageDelivery: true`, or the consumer handles the envelope. A filter test asserts `FilterPolicyScope` when the policy keys are body fields.
- **LLM likelihood:** **med**. Well known, but often missed when the test fixture only has raw bodies.

### 5. Partial-success batch APIs don't throw
- **Mistake:** `await client.send(new SendMessageBatchCommand(...))` (or `PublishBatch`, `PutEvents`, `BatchWriteItem`, `BatchGetItem`) and assuming that success means every item made it. These all return **HTTP 200 with per-item failures**.
- **Correct:**
  - SQS `SendMessageBatch` and SNS `PublishBatch`: check `Failed[]` and retry only those `Id`s.
  - EventBridge `PutEvents`: check `FailedEntryCount` and `Entries[i].ErrorCode`. Entries line up with the request by index. Max 10 entries and under 1 MB total.
  - DynamoDB `BatchWriteItem`: loop on `UnprocessedItems`, and `BatchGetItem` on `UnprocessedKeys`, **with exponential backoff**. Max 25 writes, and conditions aren't allowed. Two writes to the same key, or more than 25, get the **whole** batch rejected with `ValidationException`, so dedupe keys and chunk to 25 first.
- **Source:** https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html, https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html, https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessageBatch.html
- **Testable how:** `aws-sdk-client-mock` with `.resolvesOnce({ UnprocessedItems: {T:[...]} }).resolves({ UnprocessedItems: {} })`. Assert a second call carries only the leftovers. Give 60 items with one duplicate key and expect 3 calls of ≤25 with no duplicate. For `PutEvents`, resolve `FailedEntryCount: 1` and expect a retry of just that entry (or a thrown aggregate error). Use fake timers or an injected sleep to assert backoff is not 0.
- **LLM likelihood:** **high**. The happy-path snippet is everywhere, and the per-item checks are routinely left out.

### 6. Idempotency via conditional writes, and reading the conflicting item
- **Mistake:** Doing `GetItem` and then `PutItem` to check for existence, which races. Matching errors with `err.code === 'ConditionalCheckFailedException'` (that's SDK v2; v3 uses `err.name` or `instanceof`). Writing reserved words like `status` or `name` straight into the expression. Doing an extra `GetItem` after the failure to find out what was there.
- **Correct:** `PutCommand` with `ConditionExpression: "attribute_not_exists(pk)"`. Catch `err instanceof ConditionalCheckFailedException` (import it from `@aws-sdk/client-dynamodb`) or `err.name === "ConditionalCheckFailedException"`. Use `ExpressionAttributeNames` (`#status`) for reserved words. Pass `ReturnValuesOnConditionCheckFailure: "ALL_OLD"` to get the existing item on `err.Item`. Note: `err.Item` is in **raw AttributeValue form** (`{pk:{S:"a"}}`) even through `DynamoDBDocumentClient`, so `unmarshall()` it (verified locally with the error class; confirm the DocumentClient path in a test).
- **Source:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html, https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
- **Testable how:** An idempotent "record payment once" function. Mock `PutCommand` to reject with `new ConditionalCheckFailedException({ $metadata:{}, message:"", Item:{ pk:{S:"p1"}, status:{S:"DONE"} } })`. Expect the function to return the stored result instead of throwing, to make no `GetCommand` call, and the input to include `attribute_not_exists` plus `ReturnValuesOnConditionCheckFailure: "ALL_OLD"`.
- **LLM likelihood:** **med-high**. `err.code` and the extra read are common. The raw `err.Item` form is rarely known.

### 7. Query/Scan pagination: Limit runs before FilterExpression
- **Mistake:** `Query({ Limit: 20, FilterExpression })` and returning `Items` as "the first 20 matches". The `Limit` caps items **evaluated**, and the 1 MB cap applies before the filter too. A page can come back with `Items: []` and still have `LastEvaluatedKey`. Another mistake is stopping when `Items.length < Limit`.
- **Correct:** Loop while `LastEvaluatedKey` is defined, passing it as `ExclusiveStartKey`, or use `paginateQuery` from `@aws-sdk/lib-dynamodb`. Collect until you have N matches, then build the client cursor from the **last returned item's key attributes**, not from `LastEvaluatedKey` of an over-read page.
- **Source:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html
- **Testable how:** A hand fake of `QueryCommand` that serves pages `[ [], [a], [], [b,c] ]` with keys, then no key. `listActive(limit=2)` must return `[a,b]` and a cursor that resumes at `c`. It must not stop on the empty first page.
- **LLM likelihood:** **high**. Stopping on an empty page, and treating `Limit` as a result count, both show up a lot.

### 8. DocumentClient marshalling surprises (undefined, empty sets, big numbers)
- **Mistake:** Putting an object with `undefined` fields. That **throws** unless `marshallOptions.removeUndefinedValues: true`. An empty `Set` throws as well. Class instances throw unless `convertClassInstanceToMap: true`. Numbers: integers above `MAX_SAFE_INTEGER` now unmarshall to **`bigint`** (`9007199254740993n`), and then `JSON.stringify` throws ("Do not know how to serialize a BigInt"). High-precision decimals like `1.00000000000000000001` are **silently rounded** to `1`. Huge decimals throw.
- **Correct:** `DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true }, unmarshallOptions: { wrapNumbers: true } })` wherever ids or amounts can exceed 2^53 or need exact decimals, then read `NumberValue.value`. Or store such values as strings. **(Verified locally on util-dynamodb 3.996.9.)**
- **Source:** https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-dynamodb#configuration---marshall-and-unmarshall-options, https://github.com/aws/aws-sdk-js-v3/tree/main/packages/util-dynamodb
- **Testable how:** No mock needed. Call `marshall`/`unmarshall` from `@aws-sdk/util-dynamodb` directly, or use `aws-sdk-client-mock` to resolve `GetCommand` with a raw `N: "9007199254740993"` through the DocumentClient. The hidden test asserts the API handler's JSON response contains `"9007199254740993"` exactly and doesn't crash.
- **LLM likelihood:** **high**. Most LLMs think big numbers "lose precision" and don't know they become `bigint`. Most also forget `removeUndefinedValues`.

### 9. GSIs: never consistent, sparse, and the new multi-attribute keys
- **Mistake:** `Query({ IndexName: "gsi1", ConsistentRead: true })`, which is a `ValidationException` on GSIs. Reading a GSI straight after a write and expecting the item to be there. Treating a GSI key as unique. With the Nov 2025 **multi-attribute GSI keys** (up to 4 partition + 4 sort attributes), writing queries that skip a sort-key attribute or put a range condition on a middle one.
- **Correct:** GSIs are eventually consistent only. Get read-your-write from the base table (`GetItem` with `ConsistentRead: true`). Uniqueness comes from a separate "lock" item written in a `TransactWriteItems` with `attribute_not_exists`. Items missing any GSI key attribute are left out of the index (sparse). Multi-attribute rules: equality on **every** partition attribute; sort attributes as a left-to-right prefix; a range or `begins_with` only on the **last** one given. CDK L2 support needs aws-cdk-lib ≥ 2.226.0.
- **Source:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html, https://aws.amazon.com/blogs/database/multi-key-support-for-global-secondary-index-in-amazon-dynamodb, https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-dynamodb-multi-attribute-composite-keys-global-secondary-indexes/
- **Testable how:** A `aws-sdk-client-mock` assertion that no `QueryCommand` with `IndexName` sets `ConsistentRead: true`. A "create user with unique email" function must send one `TransactWriteCommand` with two Puts, both with `attribute_not_exists`. Testing real multi-attribute behaviour needs **DynamoDB Local or LocalStack via Docker**, and support there is unverified, so prefer a static check of the `KeyConditionExpression` builder.
- **LLM likelihood:** **high** for multi-attribute keys (post-training for many models). **Med** for consistency and uniqueness.

### 10. S3 presigned PUT URLs: checksum baked in, Content-Type not signed, expiry caps
- **Mistake:** `getSignedUrl(s3, new PutObjectCommand({ Bucket, Key, ContentType }))` with a default `S3Client` (v3.729.0+). The URL carries `x-amz-sdk-checksum-algorithm=CRC32&x-amz-checksum-crc32=AAAAAA==`, which is the CRC32 of an **empty** body, so the browser's real upload can fail the checksum check. S3-compatible stores (R2, MinIO, B2) break too. Also assuming `ContentType` is enforced: by default `X-Amz-SignedHeaders=host` only, and `ContentType` is **dropped from the URL**, so the uploader can send any type. Also `expiresIn` > 7 days throws, the default is 900 s, and a URL signed with role/STS credentials dies when that session expires, whatever `expiresIn` says. **(All verified locally on client-s3 3.1150.0.)**
- **Correct:** Use a presigning client with `requestChecksumCalculation: "WHEN_REQUIRED"` (or env `AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED`). To enforce content type, pass `{ signableHeaders: new Set(["content-type"]) }` so the client must send the same `Content-Type`. Use `expiresIn ≤ 604800`. For size/type limits use `createPresignedPost` (`@aws-sdk/s3-presigned-post`) with `Conditions: [["content-length-range", 0, max]]`.
- **Source:** https://github.com/aws/aws-sdk-js-v3/issues/6810, https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html, https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- **Testable how:** No network needed. Call `getSignedUrl` with static fake credentials and parse the URL. Assert there is no `x-amz-checksum-crc32` parameter, `X-Amz-SignedHeaders` includes `content-type`, and `X-Amz-Expires <= 604800`.
- **LLM likelihood:** **high**. The checksum default changed in Jan 2025, and almost every presign example online predates it. The unsigned Content-Type is also widely misunderstood.

### 11. Multipart uploads: part limits, ordering, and orphaned parts
- **Mistake:** Parts under 5 MiB (only the last part may be smaller), so `CompleteMultipartUpload` fails with `EntityTooSmall`. Sending `Parts` unsorted, or without the `ETag`/`PartNumber` pairs (and, with default checksums, without each part's `ChecksumCRC32`). Not calling `AbortMultipartUpload` on failure, which leaves invisible, billed parts. Uploading files over 50 GB with 5 MiB parts and running past the 10,000-part cap.
- **Correct:** `partSize = max(5 MiB, ceil(size / 10000))`. `Parts` sorted ascending by `PartNumber`, carrying `ETag` and the checksum each `UploadPart` returned. Wrap the flow in try/abort. Add the bucket lifecycle rule `AbortIncompleteMultipartUpload` (CDK `lifecycleRules: [{ abortIncompleteMultipartUploadAfter: Duration.days(1) }]`). Or use `Upload` from `@aws-sdk/lib-storage` (`partSize`, `queueSize`; `leavePartsOnError` defaults to `false`).
- **Source:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html, https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html
- **Testable how:** `aws-sdk-client-mock` on `S3Client`. Make `UploadPartCommand` resolve out of order (async delays) and make part 3 reject. Assert `AbortMultipartUploadCommand` was called with the `UploadId` and that `Complete` was never called. A happy-path variant asserts `Parts` is sorted and every part except the last is ≥ 5 MiB. A part-size function test covers a 60 GB file. CDK assertion for the lifecycle rule.
- **LLM likelihood:** **med**. The abort/lifecycle step and the size-scaled part size get missed most.

### 12. SDK v3 timeouts and retries: `requestTimeout` no longer throws by default
- **Mistake:** `new DynamoDBClient({ requestHandler: { requestTimeout: 1000 } })` and expecting calls to fail after 1 s. Since `@smithy/node-http-handler` 4.4.0 (Oct 2025), `requestTimeout` is a whole-request timer that **only logs a warning** unless `throwOnRequestTimeout: true`. The idle-socket timeout that does reject is now `socketTimeout`. Before 4.4.0, `requestTimeout` *was* the socket idle timeout. The typings say this in plain words ("requestTimeout was for a long time incorrectly being set as a socket idle timeout"). Also: reading `maxAttempts: 3` as "3 retries" when it means 3 attempts in total (default 3, `retryMode` `standard`). And having no per-call deadline.
- **Correct:** `requestHandler: { connectionTimeout: 1000, requestTimeout: 3000, throwOnRequestTimeout: true }` (optionally plus `socketTimeout`), and `maxAttempts` set knowing it counts the first try. For a hard per-call budget, pass `{ abortSignal: AbortSignal.timeout(ms) }` as the second argument of `send()`. Keep the whole retry budget under the Lambda timeout. **(Verified by reading installed 4.12.1 source and bisecting 4.3.0 → 4.4.0.)**
- **Source:** https://github.com/smithy-lang/smithy-typescript/tree/main/packages/node-http-handler (see `dist-types` `throwOnRequestTimeout` doc in `@smithy/types` `httpHandlerInitialization.d.ts`), https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- **Testable how:** A local `node:http` server on `127.0.0.1` that sends headers and then trickles a byte every 100 ms for 5 s. Point a `DynamoDBClient` at it with `endpoint` and fake credentials. The hidden test asserts the project's client factory makes `send()` reject with `name === "TimeoutError"` within about 1.5 s. A factory with only `requestTimeout` fails this test. No AWS account needed.
- **LLM likelihood:** **high**. This is new behaviour, and nearly every example online shows `requestTimeout` alone.

### 13. Lambda runtime: Node 24 drops callbacks, client reuse, and CDK's SDK bundling default
- **Mistake:** Writing `export const handler = (event, context, callback) => {...}` for `nodejs24.x`. Callback handlers are **only supported up to Node 22**. Creating SDK clients inside the handler, which repeats TLS and credential work on every invoke. Setting `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1`, which only ever applied to SDK v2; v3 keeps connections alive by default. Starting un-awaited async work at module scope (fetching config) instead of top-level `await` in ESM. Assuming CDK `NodejsFunction` bundles the SDK: by default it **marks `@aws-sdk/*` (and `@smithy/*` behind a feature flag) external** and uses the runtime's pinned SDK version. AWS itself says to bundle it.
- **Correct:** Use an async handler. Create clients once at module scope. Use top-level `await` in `.mjs`/ESM for init. Set `bundling: { bundleAwsSDK: true }` (or remove the SDK from externals) when you depend on a recent SDK feature such as `throwOnRequestTimeout` or the new checksum options. Runtimes now: `nodejs22.x` (deprecated Apr 30 2027), `nodejs24.x` (deprecated Apr 30 2028), `nodejs26.x`.
- **Source:** https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html, https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html, https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
- **Testable how:** Static checks plus a unit test. Import the handler module twice with `node:test` `mock.module` (or count constructor calls via an injected factory spy) and assert the client is created once across 3 invocations. Assert `handler.length < 3` (no callback parameter). A CDK assertion on the NodejsFunction props needs `esbuild` installed locally; or assert in a config file that `bundleAwsSDK === true`.
- **LLM likelihood:** **med-high**. The Node 24 callback removal is recent, and the CDK externals default goes against AWS's own advice.

### 14. EventBridge target retries and DLQ wiring
- **Mistake:** Assuming EventBridge gives up quickly, or never. The default target retry policy is **24 hours and up to 185 attempts** with backoff, and then the event is **dropped** unless a target DLQ is set. Pointing the DLQ at a FIFO queue (not supported), or at a queue in another Region. Creating the DLQ via API/CloudFormation without a queue policy that lets `events.amazonaws.com` call `sqs:SendMessage` with an `aws:SourceArn` condition on the rule. Permission and missing-target errors skip retries and go straight to the DLQ.
- **Correct:** Set `RetryPolicy: { MaximumRetryAttempts, MaximumEventAgeInSeconds }` and `DeadLetterConfig.Arn` on each **target** (CDK `new targets.LambdaFunction(fn, { retryAttempts, maxEventAge, deadLetterQueue })`, which also adds the queue policy). Use a standard queue in the same Region. For a Lambda target, also remember Lambda's own async retries (2 by default) and that `onFailure` destinations are a separate layer.
- **Source:** https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html, https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html
- **Testable how:** CDK `Template.fromStack`. Assert `AWS::Events::Rule.Targets[0].RetryPolicy` and `DeadLetterConfig` exist, the DLQ has no `FifoQueue`, and the `AWS::SQS::QueuePolicy` grants `sqs:SendMessage` to `events.amazonaws.com` with an `aws:SourceArn` condition.
- **LLM likelihood:** **med**. The defaults are usually misremembered, and the DLQ "standard only" rule is rarely known.

### 15. Step Functions error handling: ResultPath, States.ALL, Lambda transient errors
- **Mistake:** A `Catch` with no `ResultPath` in a JSONPath state machine. The default is `$`, so the **error output replaces the whole state input** and the next state loses the order id. Putting `States.ALL` together with other names in `ErrorEquals`, or not last, which is invalid. Expecting `States.ALL` to catch `States.Runtime` or `States.DataLimitExceeded`; it catches neither. No `Retry` for `Lambda.ServiceException`, `Lambda.AWSLambdaException`, `Lambda.SdkClientException` or `Lambda.TooManyRequestsException`. Assuming the default retry has jitter (the default `JitterStrategy` is `NONE`).
- **Correct:** `Catch: [{ ErrorEquals: ["States.ALL"], ResultPath: "$.error", Next: "Compensate" }]`, with `States.ALL` alone and last. In JSONata, reach the error via `$states.errorOutput` in `Output`/`Assign`. Add a retrier for the Lambda transient errors with `BackoffRate`, `MaxDelaySeconds` and `JitterStrategy: "FULL"`. Explicitly catch `States.DataLimitExceeded` if payloads can grow (state payload limit is 256 KB).
- **Source:** https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html, https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html#bp-lambda-serviceexception
- **Testable how:** The project emits ASL JSON (or synthesizes a CDK `StateMachine` and reads `DefinitionString`). Hidden tests walk every Task state: each `Catch` has a non-`$` `ResultPath` (JSONPath mode), `States.ALL` appears alone and last, and Lambda tasks have a retrier covering `Lambda.ServiceException`. Running it for real would need Step Functions Local or LocalStack via Docker, which isn't needed for these checks.
- **LLM likelihood:** **med**. The ResultPath overwrite catches LLMs often in generated ASL.

### 16. IAM least privilege: bucket vs object ARNs, KMS on encrypted queues
- **Mistake:** Granting `s3:GetObject` on `arn:aws:s3:::bucket` (that's the bucket ARN; objects need `arn:aws:s3:::bucket/*`). Or putting `s3:ListBucket` on `bucket/*` when it needs the bucket ARN. Without `s3:ListBucket`, a `GetObject` on a missing key returns **403 AccessDenied, not 404 NoSuchKey**, so "not found" handling never fires. Using `"Resource": "*"` or `sqs:*`. Forgetting KMS on SSE-KMS queues: the producer needs `kms:GenerateDataKey` and `kms:Decrypt`, the consumer `kms:Decrypt`.
- **Correct:** Separate statements: `s3:ListBucket` on `arn:aws:s3:::b` (optionally with an `s3:prefix` condition), and `s3:GetObject`/`s3:PutObject` on `arn:aws:s3:::b/prefix/*`. In CDK prefer `bucket.grantRead(fn, "prefix/*")`, `queue.grantSendMessages(fn)` and `queue.grantConsumeMessages(fn)`; these add the KMS grants for you when the queue has an `encryptionMasterKey`.
- **Source:** https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html (permissions section: 403 vs 404), https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
- **Testable how:** CDK `Template.fromStack` plus `Match.objectLike` on `AWS::IAM::Policy`. Assert there is no `Resource: "*"` and no `Action` ending in `:*`. Assert `s3:GetObject` resources end in `/*` and `s3:ListBucket` resources don't. When the queue uses a CMK, assert a `kms:Decrypt` statement on that key exists. A code-side unit test: the S3 "get file" helper maps both `NoSuchKey` and an `AccessDenied` 403 to a `NotFound` result only when the policy lacks ListBucket (or the test asserts ListBucket is granted).
- **LLM likelihood:** **med**. `grant*` helpers hide most of it, but hand-written policies and the 403-vs-404 behaviour trip LLMs up.

## Versions checked (2026-10-12)

| Thing | Version / status | Source |
|---|---|---|
| `@aws-sdk/client-*` (s3, sqs, dynamodb), `@aws-sdk/lib-dynamodb`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/lib-storage` | 3.1150.0 (published 2026-10-12) | `npm view` |
| `@aws-sdk/util-dynamodb` | 3.996.9 (resolved dependency) | local install |
| `@smithy/node-http-handler` | 4.12.1. `throwOnRequestTimeout` added in 4.4.0 (2025-10-13) | `npm view … time`, tarball bisect |
| S3 default checksums (`requestChecksumCalculation: WHEN_SUPPORTED`) | since client-s3 3.729.0 (Jan 2025) | https://github.com/aws/aws-sdk-js-v3/issues/6810 |
| `aws-cdk-lib` / `aws-cdk` CLI | 2.273.0 / 2.1145.0 | `npm view` |
| `aws-sdk-client-mock` | 4.1.0 (last published 2024-10-15; still works with SDK 3.1150.0, verified locally) | `npm view`, local run |
| `@aws-lambda-powertools/batch` | 2.36.0 | `npm view` |
| `@types/aws-lambda` | 8.10.164 | `npm view` |
| Lambda Node runtimes | nodejs22.x (deprecated 2027-04-30), nodejs24.x (2028-04-30), nodejs26.x (not scheduled). Callbacks only up to 22 | https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html |
| Local Node used for checks | v24.21.0 | `node -v` |
| SQS max message size | 1 MiB (since Aug 2025; Lambda ESM supports it) | https://aws.amazon.com/about-aws/whats-new/2025/08/amazon-sqs-max-payload-size-1mib |
| SQS fair queues (MessageGroupId on standard) | GA July 2025 | https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-sqs-introduces-fair/ |
| DynamoDB multi-attribute GSI keys | GA Nov 2025; CDK L2 from 2.226.0 | https://aws.amazon.com/blogs/database/multi-key-support-for-global-secondary-index-in-amazon-dynamodb |

**Gaps, not verified:** whether DynamoDB Local or LocalStack support multi-attribute GSI keys yet. The exact S3 server response when a presigned PUT carries a mismatched `x-amz-checksum-crc32` (reported as failures in issues; not reproduced against real S3). Whether `DynamoDBDocumentClient` unmarshalls `err.Item` (believed not to; the trap 6 test should pin it).
