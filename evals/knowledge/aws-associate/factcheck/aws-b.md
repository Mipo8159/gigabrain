# AWS associate fact-check, batch b

Date: 2026-10-15. Files: exams/v3.json, exams/v4.json. Checker: bin/check-exam exit 0.

## v3.json

| id | verdict | source | note |
|---|---|---|---|
| aws-associate-v3-q01 | ok | known |  |
| aws-associate-v3-q02 | ok | known |  |
| aws-associate-v3-q03 | ok | https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html | Snowball closed to new customers; arithmetic checked |
| aws-associate-v3-q04 | ok | known |  |
| aws-associate-v3-q05 | ok | known |  |
| aws-associate-v3-q06 | ok | known | Aurora Global: failover within minutes per EXAM.md |
| aws-associate-v3-q07 | ok | known |  |
| aws-associate-v3-q08 | ok | known |  |
| aws-associate-v3-q09 | fixed | https://aws.amazon.com/about-aws/whats-new/2025/12/database-savings-plans-savings | Savings Plan why: Database Savings Plans exist now |
| aws-associate-v3-q10 | ok | known |  |
| aws-associate-v3-q11 | ok | known |  |
| aws-associate-v3-q12 | ok | known |  |
| aws-associate-v3-q13 | ok | known |  |
| aws-associate-v3-q14 | ok | known |  |
| aws-associate-v3-q15 | fixed | https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html | grant distractor why: CreateGrant works cross-account if key policy allows |
| aws-associate-v3-q16 | ok | known |  |
| aws-associate-v3-q17 | ok | known |  |
| aws-associate-v3-q18 | fixed | https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_managed.html | 'managed rotation' is master-user only; now 'automatic rotation' |
| aws-associate-v3-q19 | ok | known |  |
| aws-associate-v3-q20 | ok | known |  |
| aws-associate-v3-q21 | ok | known |  |
| aws-associate-v3-q22 | ok | known |  |
| aws-associate-v3-q23 | ok | known |  |
| aws-associate-v3-q24 | fixed | https://docs.aws.amazon.com/waf/latest/developerguide/ddos-automatic-app-layer-response.html | Shield L7 auto mitigation is legacy since 2026-03; noted in why |
| aws-associate-v3-q25 | fixed | https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html | gp3 why: 80,000 IOPS max, single-digit ms latency |
| aws-associate-v3-q26 | ok | known |  |
| aws-associate-v3-q27 | ok | known |  |
| aws-associate-v3-q28 | ok | known |  |
| aws-associate-v3-q29 | ok | known |  |
| aws-associate-v3-q30 | ok | known |  |
| aws-associate-v3-q31 | ok | known | rds.force_ssl defaults to 1 on PG 15+; setting it is still correct |
| aws-associate-v3-q32 | ok | known |  |
| aws-associate-v3-q33 | ok | known |  |
| aws-associate-v3-q34 | ok | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/reserved-capacity.html | reserved capacity still offered (provisioned, Standard class) |
| aws-associate-v3-q35 | ok | known |  |
| aws-associate-v3-q36 | ok | known |  |
| aws-associate-v3-q37 | ok | known |  |
| aws-associate-v3-q38 | ok | known |  |
| aws-associate-v3-q39 | ok | known |  |
| aws-associate-v3-q40 | ok | known |  |
| aws-associate-v3-q41 | ok | known |  |
| aws-associate-v3-q42 | ok | known |  |
| aws-associate-v3-q43 | ok | https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html | gp3 baseline 3,000 IOPS/125 MiB/s, Elastic Volumes online |
| aws-associate-v3-q44 | ok | known |  |
| aws-associate-v3-q45 | ok | known |  |
| aws-associate-v3-q46 | ok | known |  |
| aws-associate-v3-q47 | ok | known |  |
| aws-associate-v3-q48 | fixed | https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html | RTC SLA 99.99% -> 99.9% |
| aws-associate-v3-q49 | ok | known |  |
| aws-associate-v3-q50 | ok | known |  |
| aws-associate-v3-q51 | ok | known |  |
| aws-associate-v3-q52 | ok | known | 'Regional (Standard)' wording loose but defensible |
| aws-associate-v3-q53 | ok | known |  |
| aws-associate-v3-q54 | ok | known |  |
| aws-associate-v3-q55 | ok | known |  |
| aws-associate-v3-q56 | ok | known |  |
| aws-associate-v3-q57 | fixed | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html | key still right; blue/green can now encrypt too, noted; 'the' -> 'a' supported way |
| aws-associate-v3-q58 | ok | known |  |
| aws-associate-v3-q59 | ok | known |  |
| aws-associate-v3-q60 | ok | known |  |
| aws-associate-v3-q61 | ok | known |  |
| aws-associate-v3-q62 | ok | known |  |
| aws-associate-v3-q63 | ok | known |  |
| aws-associate-v3-q64 | ok | known |  |
| aws-associate-v3-q65 | ok | known |  |

## v4.json

| id | verdict | source | note |
|---|---|---|---|
| aws-associate-v4-q01 | ok | known |  |
| aws-associate-v4-q02 | ok | known |  |
| aws-associate-v4-q03 | ok | known |  |
| aws-associate-v4-q04 | ok | known |  |
| aws-associate-v4-q05 | ok | known |  |
| aws-associate-v4-q06 | ok | known |  |
| aws-associate-v4-q07 | ok | known |  |
| aws-associate-v4-q08 | ok | known |  |
| aws-associate-v4-q09 | ok | known |  |
| aws-associate-v4-q10 | ok | known | 1,500 msg/s needs batching or high-throughput FIFO; key still right |
| aws-associate-v4-q11 | ok | known |  |
| aws-associate-v4-q12 | ok | known |  |
| aws-associate-v4-q13 | ok | known |  |
| aws-associate-v4-q14 | ok | known |  |
| aws-associate-v4-q15 | ok | known |  |
| aws-associate-v4-q16 | ok | known |  |
| aws-associate-v4-q17 | ok | known | Aurora Global failover in minutes |
| aws-associate-v4-q18 | fixed | https://aws.amazon.com/about-aws/whats-new/2025/12/database-savings-plans-savings | Savings Plan why: Database Savings Plans exist now |
| aws-associate-v4-q19 | ok | known |  |
| aws-associate-v4-q20 | ok | known |  |
| aws-associate-v4-q21 | ok | known |  |
| aws-associate-v4-q22 | fixed | https://docs.aws.amazon.com/waf/latest/developerguide/ddos-automatic-app-layer-response.html | Shield L7 auto mitigation legacy; noted in why |
| aws-associate-v4-q23 | ok | known |  |
| aws-associate-v4-q24 | ok | known |  |
| aws-associate-v4-q25 | ok | known |  |
| aws-associate-v4-q26 | ok | known |  |
| aws-associate-v4-q27 | ok | known |  |
| aws-associate-v4-q28 | ok | known |  |
| aws-associate-v4-q29 | ok | known |  |
| aws-associate-v4-q30 | ok | known | Multi-AZ failover typically 60-120 s |
| aws-associate-v4-q31 | ok | known |  |
| aws-associate-v4-q32 | ok | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/reserved-capacity.html | reserved capacity still offered |
| aws-associate-v4-q33 | fixed | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/request-static-ips.html | CloudFront now has Anycast static IPs (3 or 21); why no longer claims none |
| aws-associate-v4-q34 | ok | known |  |
| aws-associate-v4-q35 | ok | known |  |
| aws-associate-v4-q36 | ok | known |  |
| aws-associate-v4-q37 | ok | known |  |
| aws-associate-v4-q38 | ok | known |  |
| aws-associate-v4-q39 | ok | known |  |
| aws-associate-v4-q40 | ok | known |  |
| aws-associate-v4-q41 | ok | known |  |
| aws-associate-v4-q42 | ok | known |  |
| aws-associate-v4-q43 | ok | known |  |
| aws-associate-v4-q44 | ok | known |  |
| aws-associate-v4-q45 | ok | known |  |
| aws-associate-v4-q46 | ok | known |  |
| aws-associate-v4-q47 | ok | known |  |
| aws-associate-v4-q48 | ok | known |  |
| aws-associate-v4-q49 | ok | known |  |
| aws-associate-v4-q50 | ok | known |  |
| aws-associate-v4-q51 | fixed | https://docs.aws.amazon.com/prescriptive-guidance/latest/designing-control-tower-landing-zone/logging.html | explain overclaimed Control Tower default layout incl. WORM; softened |
| aws-associate-v4-q52 | ok | https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html | RTC 99.9% correct |
| aws-associate-v4-q53 | ok | known |  |
| aws-associate-v4-q54 | ok | known |  |
| aws-associate-v4-q55 | ok | known |  |
| aws-associate-v4-q56 | ok | known |  |
| aws-associate-v4-q57 | ok | known |  |
| aws-associate-v4-q58 | ok | https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html | gp3 facts correct |
| aws-associate-v4-q59 | ok | known |  |
| aws-associate-v4-q60 | ok | known |  |
| aws-associate-v4-q61 | fixed | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-considerations.html | keys still right; blue/green can now encrypt unencrypted instance, noted |
| aws-associate-v4-q62 | ok | known |  |
| aws-associate-v4-q63 | ok | known |  |
| aws-associate-v4-q64 | ok | known |  |
| aws-associate-v4-q65 | ok | known |  |
