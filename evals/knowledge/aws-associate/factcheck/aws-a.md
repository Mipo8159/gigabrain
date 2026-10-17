# AWS associate fact-check: v1 + v2

Date: 2026-10-15. Files: `exams/v1.json`, `exams/v2.json`. Checker: `bin/check-exam` exit 0 after edits.

## v1

| id | verdict | source | note |
|---|---|---|---|
| aws-associate-v1-q01 | ok | known | |
| aws-associate-v1-q02 | ok | known | |
| aws-associate-v1-q03 | ok | known | |
| aws-associate-v1-q04 | ok | known | |
| aws-associate-v1-q05 | ok | known | |
| aws-associate-v1-q06 | ok | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html | |
| aws-associate-v1-q07 | ok | known | |
| aws-associate-v1-q08 | ok | https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html | |
| aws-associate-v1-q09 | ok | known | |
| aws-associate-v1-q10 | ok | known | |
| aws-associate-v1-q11 | ok | known | |
| aws-associate-v1-q12 | ok | known | |
| aws-associate-v1-q13 | ok | known | |
| aws-associate-v1-q14 | ok | known | |
| aws-associate-v1-q15 | fixed | https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_managed.html | "managed rotation" is only for master users; reworded to automatic rotation with AWS-provided function |
| aws-associate-v1-q16 | ok | known | |
| aws-associate-v1-q17 | ok | known | |
| aws-associate-v1-q18 | ok | known | |
| aws-associate-v1-q19 | ok | EXAM.md (aws:SourceIp finding, checked 2026-10-15) | |
| aws-associate-v1-q20 | ok | known | |
| aws-associate-v1-q21 | ok | known | |
| aws-associate-v1-q22 | ok | known | |
| aws-associate-v1-q23 | ok | known | |
| aws-associate-v1-q24 | ok | known | |
| aws-associate-v1-q25 | ok | known | |
| aws-associate-v1-q26 | ok | known | |
| aws-associate-v1-q27 | ok | known | |
| aws-associate-v1-q28 | ok | known | |
| aws-associate-v1-q29 | ok | known | |
| aws-associate-v1-q30 | ok | known | |
| aws-associate-v1-q31 | ok | https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html | |
| aws-associate-v1-q32 | ok | known | |
| aws-associate-v1-q33 | ok | known | |
| aws-associate-v1-q34 | ok | known | |
| aws-associate-v1-q35 | ok | known | |
| aws-associate-v1-q36 | ok | known | |
| aws-associate-v1-q37 | ok | known | |
| aws-associate-v1-q38 | ok | known | |
| aws-associate-v1-q39 | ok | https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html | |
| aws-associate-v1-q40 | ok | known | |
| aws-associate-v1-q41 | ok | known | |
| aws-associate-v1-q42 | ok | known | |
| aws-associate-v1-q43 | ok | known | |
| aws-associate-v1-q44 | ok | https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html | |
| aws-associate-v1-q45 | ok | known | |
| aws-associate-v1-q46 | ok | EXAM.md (snowball-edge-availability-change, checked 2026-10-15) | |
| aws-associate-v1-q47 | ok | known | |
| aws-associate-v1-q48 | ok | known | |
| aws-associate-v1-q49 | ok | https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html | |
| aws-associate-v1-q50 | ok | known | |
| aws-associate-v1-q51 | ok | known | |
| aws-associate-v1-q52 | ok | known | |
| aws-associate-v1-q53 | fixed | https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html | 1 TiB gp2 gives ~3,000 IOPS, not 4,000; need set to 3,000 (gp3 baseline), io2 distractor matched |
| aws-associate-v1-q54 | ok | known | |
| aws-associate-v1-q55 | ok | known | |
| aws-associate-v1-q56 | ok | known | |
| aws-associate-v1-q57 | ok | known | |
| aws-associate-v1-q58 | ok | known | |
| aws-associate-v1-q59 | ok | known | |
| aws-associate-v1-q60 | ok | https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html | |
| aws-associate-v1-q61 | fixed | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-considerations.html | key ok; explain now notes blue/green can encrypt an unencrypted instance |
| aws-associate-v1-q62 | ok | known | |
| aws-associate-v1-q63 | ok | known | |
| aws-associate-v1-q64 | ok | EXAM.md (RTC 99.9%, checked 2026-10-15) | |
| aws-associate-v1-q65 | ok | known | |

## v2

| id | verdict | source | note |
|---|---|---|---|
| aws-associate-v2-q01 | ok | known | |
| aws-associate-v2-q02 | ok | known | |
| aws-associate-v2-q03 | ok | https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html | |
| aws-associate-v2-q04 | ok | https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html | |
| aws-associate-v2-q05 | ok | known | |
| aws-associate-v2-q06 | ok | known | |
| aws-associate-v2-q07 | ok | known | |
| aws-associate-v2-q08 | ok | known | |
| aws-associate-v2-q09 | ok | https://docs.aws.amazon.com/ram/latest/userguide/shareable.html | |
| aws-associate-v2-q10 | ok | known | |
| aws-associate-v2-q11 | ok | known | |
| aws-associate-v2-q12 | ok | known | |
| aws-associate-v2-q13 | ok | https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html | |
| aws-associate-v2-q14 | ok | https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html | |
| aws-associate-v2-q15 | ok | known | |
| aws-associate-v2-q16 | ok | https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html | |
| aws-associate-v2-q17 | ok | known | |
| aws-associate-v2-q18 | ok | known | |
| aws-associate-v2-q19 | ok | known | |
| aws-associate-v2-q20 | ok | known | |
| aws-associate-v2-q21 | ok | known | |
| aws-associate-v2-q22 | fixed | https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_managed.html | "managed rotation" -> "automatic rotation" (app user, not master) |
| aws-associate-v2-q23 | ok | known | |
| aws-associate-v2-q24 | ok | known | |
| aws-associate-v2-q25 | ok | known | |
| aws-associate-v2-q26 | ok | known | |
| aws-associate-v2-q27 | ok | known | |
| aws-associate-v2-q28 | ok | known | |
| aws-associate-v2-q29 | ok | known | |
| aws-associate-v2-q30 | ok | known | |
| aws-associate-v2-q31 | ok | known | |
| aws-associate-v2-q32 | ok | known | |
| aws-associate-v2-q33 | ok | known | |
| aws-associate-v2-q34 | ok | known | |
| aws-associate-v2-q35 | ok | known | |
| aws-associate-v2-q36 | ok | https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html | |
| aws-associate-v2-q37 | ok | known | |
| aws-associate-v2-q38 | ok | known | |
| aws-associate-v2-q39 | ok | known | |
| aws-associate-v2-q40 | ok | known | |
| aws-associate-v2-q41 | ok | known | |
| aws-associate-v2-q42 | ok | known | |
| aws-associate-v2-q43 | ok | known | |
| aws-associate-v2-q44 | ok | known | |
| aws-associate-v2-q45 | ok | known | |
| aws-associate-v2-q46 | ok | https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html | |
| aws-associate-v2-q47 | ok | known | |
| aws-associate-v2-q48 | ok | known | |
| aws-associate-v2-q49 | ok | known | |
| aws-associate-v2-q50 | ok | known | |
| aws-associate-v2-q51 | fixed | https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_organizations.html | GuardDuty delegated admin is Regional; why/explain no longer claim one setup covers every Region |
| aws-associate-v2-q52 | ok | known | |
| aws-associate-v2-q53 | ok | https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html | |
| aws-associate-v2-q54 | ok | known | |
| aws-associate-v2-q55 | ok | known | |
| aws-associate-v2-q56 | ok | known | |
| aws-associate-v2-q57 | ok | known | |
| aws-associate-v2-q58 | ok | https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html | |
| aws-associate-v2-q59 | ok | known | |
| aws-associate-v2-q60 | ok | known | |
| aws-associate-v2-q61 | ok | known | |
| aws-associate-v2-q62 | ok | known | |
| aws-associate-v2-q63 | ok | EXAM.md (snowball-edge-availability-change, checked 2026-10-15) | |
| aws-associate-v2-q64 | ok | EXAM.md (RTC 99.9%, checked 2026-10-15) | |
| aws-associate-v2-q65 | ok | https://docs.aws.amazon.com/ram/latest/userguide/shareable.html | |
