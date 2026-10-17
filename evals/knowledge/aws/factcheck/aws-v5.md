# AWS v5 exam fact-check

Date: 2026-10-17. File: evals/knowledge/aws/exams/v5.json (20 questions).
Method: official docs pages fetched today, the AWS What's New API for anything
dated, and running `@aws-sdk/util-dynamodb` / `client-dynamodb` (latest on npm)
where cheap. aws-v5-q01 was already confirmed in `../../nestjs/factcheck/nestjs-partial.md`;
its "SQS 1 MiB since 2025" explain claim is now also checked (What's New 2025-08-04).

Counts: confirmed 15, fixed 5. bin/check-exam aws: 0 problems after edits.

| id | verdict | source URL(s) | note |
|---|---|---|---|
| aws-v5-q01 | confirmed | https://aws.amazon.com/about-aws/whats-new/2025/08/amazon-sqs-max-payload-size-1mib/ ; https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html | Checked earlier (SNS 1 MiB opt-in). Today: SQS max is 1,048,576 bytes, announced 2025-08-04, so the explain is right. |
| aws-v5-q02 | confirmed | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html | Reasoning item. The idempotency window must cover DLQ retention and redrive. |
| aws-v5-q03 | fixed | https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html ; https://aws.amazon.com/about-aws/whats-new/2026/10/lambda-recursive-loops-eventbridge-custom/ | **New since training:** on 2026-10-14 Lambda recursive loop detection started covering EventBridge **custom** event buses (it already covered SQS, SNS and S3). On a custom bus the 400x loop would be stopped automatically, so the stem now says the rule is on the **default** bus (still not covered). The explain now names the covered services. The key (distinct source/detail-type, specific pattern) is unchanged. Refs: added the recursion page and the announcement. |
| aws-v5-q04 | confirmed | https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html | Standard queue batch up to 10,000; FIFO max 10; visibility timeout = 6 x function timeout + MaximumBatchingWindowInSeconds (the docs' wording). The window maximum is 300 s. |
| aws-v5-q05 | fixed | https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html | Facts correct (Standard exactly-once; async Express at-least-once; sync Express at-most-once; 5 min). Fix is refs only: added the page that states the semantics. The old ref (error handling) doesn't. |
| aws-v5-q06 | confirmed | https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html ; https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html | ESM maximum concurrency caps pollers. Note: provisioned mode now exists and can't be combined with max concurrency. That doesn't change the answer. |
| aws-v5-q07 | confirmed | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html | Single-table item collection; 400 KB item limit. |
| aws-v5-q08 | confirmed | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.HowItWorks.html | The export needs PITR and is "asynchronous, they don't consume read capacity". |
| aws-v5-q09 | confirmed | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html | Limit is applied before the filter. The cursor bug is logic in the code. |
| aws-v5-q10 | confirmed | https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-dynamodb#configuration---marshall-and-unmarshall-options | **Ran:** `marshall({b: undefined})` throws "Pass options.removeUndefinedValues=true..."; it passes with the option. An empty Set throws ("Pass a non-empty set, or options.convertEmptyValues=true"). `convertClassInstanceToMap` still throws on undefined. |
| aws-v5-q11 | confirmed | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html | TransactWriteItems with a condition per item is atomic. BatchWriteItem takes no conditions. |
| aws-v5-q12 | confirmed | https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html | "If you don't have the s3:ListBucket permission, Amazon S3 returns an HTTP status code 403". |
| aws-v5-q13 | fixed | https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html | Facts correct. The ref `amazondynamodb/.../vpc-endpoints-dynamodb.html` now redirects to the guide index; replaced it with the PrivateLink gateway-endpoint page. |
| aws-v5-q14 | confirmed | https://docs.aws.amazon.com/sns/latest/api/API_BatchResultErrorEntry.html | `SenderFault`: "whether the error happened due to the caller". |
| aws-v5-q15 | confirmed | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html | The token is valid for 10 min. In SDK v3 (latest), `ClientRequestToken` has the idempotencyToken trait, filled at serialize time, once per `send()`. The retry middleware resends that serialized request, so SDK retries reuse it and an app retry gets a new one. |
| aws-v5-q16 | confirmed | https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html | If-None-Match gives 412. Object Lock doesn't stop new versions being written. |
| aws-v5-q17 | confirmed | https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel | Strong read-after-write consistency, LIST included, in all Regions. |
| aws-v5-q18 | fixed | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html ; https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html | **Post-training:** MRSC global tables (strong consistency, 2 replicas + witness allowed, us-east-1/us-west-2 eligible) evaluate conditional writes globally. In MRSC the "conditional write" distractor would work. The stem now pins the default MREC mode. The key matches the docs ("add an attribute ... in which Region the change occurred"). Replaced the dead ref `services-ddb-errors.html` (redirects to the Lambda index). |
| aws-v5-q19 | confirmed | https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html | Textbook. |
| aws-v5-q20 | fixed | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html | "MRSC global tables do not publish a ReplicationLatency metric", so a keyed option was only true for MREC. The stem now says "default MREC mode". |

## Cross-file grep

- "recursion / loop detection" across all `evals/knowledge/*/exams/*.json`: no other
  question claims which services Lambda recursion detection covers.
- Global-table questions that touch conditions or ReplicationLatency without naming the
  mode (grep "global table" plus condition/ReplicationLatency, no MREC/MRSC/strong):
  **aws-v2-q20** (not edited, not my file). Its distractor "Rely on global table condition
  expressions to prevent double-booking across Regions" is wrong only for MREC. MRSC
  evaluates conditions globally. Suggest pinning the stem to MREC, as done in v5-q18.
  aws-v1-q18, aws-v2-q18 and aws-v3-q20 already name the mode or strong consistency.

## Notes for the aws BRIEF
- 2026-10-14: Lambda recursive loop detection now covers EventBridge custom event buses (not the default bus).
- DynamoDB global tables have two modes. MREC is the default; MRSC has synchronous replication,
  global conditional writes and no ReplicationLatency metric, and needs exactly 3 Regions
  (or 2 + a witness). Stems about global tables should name the mode.
