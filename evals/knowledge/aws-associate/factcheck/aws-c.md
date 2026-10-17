# AWS fact-check, batch c
Date: 2026-10-15. Files: evals/knowledge/aws-associate/exams/v5.json, evals/knowledge/aws/exams/v1.json … v5.json.

## aws-associate/exams/v5.json (65)

| id | verdict | source | note |
|---|---|---|---|
| aws-associate-v5-q01 | ok | known |  |
| aws-associate-v5-q02 | ok | known |  |
| aws-associate-v5-q03 | fixed | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/request-static-ips.html | CloudFront distractor 'why' claimed no static anycast IPs; CloudFront now offers Anycast static IP lists. Reason now UDP only. |
| aws-associate-v5-q04 | ok | known |  |
| aws-associate-v5-q05 | ok | known |  |
| aws-associate-v5-q06 | fixed | https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html | Global DB failover 'about a minute' -> 'within minutes' (docs: within a few minutes). |
| aws-associate-v5-q07 | ok | known |  |
| aws-associate-v5-q08 | ok | known |  |
| aws-associate-v5-q09 | ok | known |  |
| aws-associate-v5-q10 | ok | known |  |
| aws-associate-v5-q11 | ok | known |  |
| aws-associate-v5-q12 | ok | known |  |
| aws-associate-v5-q13 | ok | known |  |
| aws-associate-v5-q14 | ok | known |  |
| aws-associate-v5-q15 | ok | known |  |
| aws-associate-v5-q16 | ok | known | WAF rate-based rule; threshold/window fit. |
| aws-associate-v5-q17 | ok | known |  |
| aws-associate-v5-q18 | ok | known |  |
| aws-associate-v5-q19 | ok | known |  |
| aws-associate-v5-q20 | ok | known |  |
| aws-associate-v5-q21 | ok | known |  |
| aws-associate-v5-q22 | ok | known |  |
| aws-associate-v5-q23 | ok | known |  |
| aws-associate-v5-q24 | ok | known |  |
| aws-associate-v5-q25 | ok | known |  |
| aws-associate-v5-q26 | ok | known |  |
| aws-associate-v5-q27 | ok | known |  |
| aws-associate-v5-q28 | ok | known |  |
| aws-associate-v5-q29 | ok | known |  |
| aws-associate-v5-q30 | ok | known |  |
| aws-associate-v5-q31 | ok | known |  |
| aws-associate-v5-q32 | ok | known |  |
| aws-associate-v5-q33 | ok | known |  |
| aws-associate-v5-q34 | ok | known |  |
| aws-associate-v5-q35 | ok | https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modify-volume.html | io2 BE up to 256k IOPS; gp3 can't reach 200k. |
| aws-associate-v5-q36 | fixed | https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modify-volume.html | Key text said 'then shrink capacity'; EBS volumes cannot be decreased. Dropped; why notes migration to a smaller volume. |
| aws-associate-v5-q37 | ok | known |  |
| aws-associate-v5-q38 | ok | known |  |
| aws-associate-v5-q39 | ok | known |  |
| aws-associate-v5-q40 | ok | known |  |
| aws-associate-v5-q41 | ok | known |  |
| aws-associate-v5-q42 | ok | known |  |
| aws-associate-v5-q43 | ok | known |  |
| aws-associate-v5-q44 | ok | known |  |
| aws-associate-v5-q45 | ok | https://aws.amazon.com/savingsplans/database-pricing | DB Savings Plans 1-yr, no upfront; 3-yr RI deeper for stable config. |
| aws-associate-v5-q46 | ok | known |  |
| aws-associate-v5-q47 | ok | known |  |
| aws-associate-v5-q48 | ok | known |  |
| aws-associate-v5-q49 | ok | known |  |
| aws-associate-v5-q50 | ok | known |  |
| aws-associate-v5-q51 | ok | known | SnapStart would also help Java, but not an option. |
| aws-associate-v5-q52 | ok | known |  |
| aws-associate-v5-q53 | ok | known |  |
| aws-associate-v5-q54 | ok | known |  |
| aws-associate-v5-q55 | ok | known |  |
| aws-associate-v5-q56 | ok | known |  |
| aws-associate-v5-q57 | ok | known |  |
| aws-associate-v5-q58 | ok | known |  |
| aws-associate-v5-q59 | ok | known |  |
| aws-associate-v5-q60 | ok | https://aws.amazon.com/about-aws/whats-new/2025/06/aws-certificate-manager-public-certificates-use-anywhere | Exportable public certs carry a fee. |
| aws-associate-v5-q61 | ok | known |  |
| aws-associate-v5-q62 | ok | known |  |
| aws-associate-v5-q63 | ok | known |  |
| aws-associate-v5-q64 | ok | known |  |
| aws-associate-v5-q65 | ok | known |  |

## aws/exams/v1.json (20)

| id | verdict | source | note |
|---|---|---|---|
| aws-v1-q01 | ok | known | 6x function timeout + batching window; maxReceiveCount>=5 (Lambda SQS docs). |
| aws-v1-q02 | ok | known |  |
| aws-v1-q03 | ok | known |  |
| aws-v1-q04 | ok | https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html | DLQ standard-only, same Region. |
| aws-v1-q05 | ok | known |  |
| aws-v1-q06 | ok | known |  |
| aws-v1-q07 | ok | known |  |
| aws-v1-q08 | ok | known |  |
| aws-v1-q09 | ok | known |  |
| aws-v1-q10 | ok | known |  |
| aws-v1-q11 | ok | known |  |
| aws-v1-q12 | ok | npm @smithy/node-http-handler 4.3.0 vs 4.4.0 vs 4.12.1 source; @aws-sdk/client-dynamodb 3.1150.0 exists | requestTimeout warns unless throwOnRequestTimeout, added in 4.4.0. |
| aws-v1-q13 | ok | known |  |
| aws-v1-q14 | ok | known |  |
| aws-v1-q15 | ok | known |  |
| aws-v1-q16 | ok | npm @aws-sdk/s3-request-presigner 3.1152.0 source (unsignableHeaders.add('content-type')) | ContentType not signed by default. |
| aws-v1-q17 | ok | known |  |
| aws-v1-q18 | ok | known |  |
| aws-v1-q19 | ok | known |  |
| aws-v1-q20 | fixed | https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html | RTC 99.99% -> 99.9% within 15 min. |

## aws/exams/v2.json (20)

| id | verdict | source | note |
|---|---|---|---|
| aws-v2-q01 | ok | known |  |
| aws-v2-q02 | ok | known |  |
| aws-v2-q03 | ok | known |  |
| aws-v2-q04 | ok | known |  |
| aws-v2-q05 | ok | known |  |
| aws-v2-q06 | ok | known |  |
| aws-v2-q07 | ok | known |  |
| aws-v2-q08 | ok | known |  |
| aws-v2-q09 | ok | known | TTL deletion typically within a few days. |
| aws-v2-q10 | ok | known |  |
| aws-v2-q11 | ok | known |  |
| aws-v2-q12 | ok | known |  |
| aws-v2-q13 | ok | known |  |
| aws-v2-q14 | ok | known |  |
| aws-v2-q15 | ok | known | NodejsFunction externalises @aws-sdk/* on Node 18+; bundleAwsSDK prop. |
| aws-v2-q16 | ok | local run: @aws-sdk/client-s3 3.1150.0 getSignedUrl emits x-amz-checksum-crc32=AAAAAA== by default, none with WHEN_REQUIRED |  |
| aws-v2-q17 | ok | known |  |
| aws-v2-q18 | ok | known | MRSC: 3 Regions or 2 + witness. |
| aws-v2-q19 | ok | known |  |
| aws-v2-q20 | ok | known |  |

## aws/exams/v3.json (20)

| id | verdict | source | note |
|---|---|---|---|
| aws-v3-q01 | ok | known |  |
| aws-v3-q02 | ok | known |  |
| aws-v3-q03 | ok | known |  |
| aws-v3-q04 | ok | known | Step Functions JitterStrategy default NONE. |
| aws-v3-q05 | ok | known |  |
| aws-v3-q06 | ok | known |  |
| aws-v3-q07 | ok | known |  |
| aws-v3-q08 | ok | known |  |
| aws-v3-q09 | ok | known |  |
| aws-v3-q10 | ok | known | ReturnValuesOnConditionCheckFailure on PutItem; raw AttributeValues via DocumentClient. |
| aws-v3-q11 | ok | local run: @aws-sdk/util-dynamodb 3.996.9 unmarshall returns bigint above MAX_SAFE_INTEGER, rounds long decimals |  |
| aws-v3-q12 | ok | known |  |
| aws-v3-q13 | ok | known |  |
| aws-v3-q14 | ok | known |  |
| aws-v3-q15 | ok | npm @smithy/node-http-handler 4.12.1 source (maxSockets = 50, capacity warning) |  |
| aws-v3-q16 | ok | known |  |
| aws-v3-q17 | ok | known |  |
| aws-v3-q18 | ok | known |  |
| aws-v3-q19 | ok | known |  |
| aws-v3-q20 | ok | known |  |

## aws/exams/v4.json (20)

| id | verdict | source | note |
|---|---|---|---|
| aws-v4-q01 | ok | https://aws.amazon.com/about-aws/whats-new/2025/07/amazon-sqs-introduces-fair/ | Fair queues on standard queues, July 2025. |
| aws-v4-q02 | ok | known |  |
| aws-v4-q03 | ok | known |  |
| aws-v4-q04 | ok | known |  |
| aws-v4-q05 | ok | known |  |
| aws-v4-q06 | ok | known |  |
| aws-v4-q07 | ok | known |  |
| aws-v4-q08 | ok | known |  |
| aws-v4-q09 | ok | known |  |
| aws-v4-q10 | ok | known |  |
| aws-v4-q11 | ok | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.DesignPattern.MultiAttributeKeys.html | Multi-attribute GSI keys (Nov 2025): equality on all PK attrs, SK left-to-right, range on last only. |
| aws-v4-q12 | ok | known |  |
| aws-v4-q13 | ok | known | SQS SSE-KMS producer needs GenerateDataKey + Decrypt. |
| aws-v4-q14 | ok | https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html | Callback handlers only up to Node.js 22. |
| aws-v4-q15 | ok | known |  |
| aws-v4-q16 | fixed | local run: fetch Request with typed Blob sends Content-Type application/pdf; ArrayBuffer sends none; signableHeaders signs content-type | Stem used `body: file`; a File carries its type, so fetch would send application/pdf and the key was wrong. Stem now uses `await file.arrayBuffer()`; why updated. |
| aws-v4-q17 | fixed | https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html | Explain said 5 TiB max object; now 48.8 TiB (50 TB, Dec 2025), 5 GiB max part. |
| aws-v4-q18 | ok | known |  |
| aws-v4-q19 | ok | known |  |
| aws-v4-q20 | ok | known |  |
