# AWS Certified Solutions Architect – Associate (SAA-C03): exam facts for the practice variants

Checked live 2026-10-15 by the `researcher` agent against official AWS pages. Re-check before
rebuilding the variants: a new exam version (SAA-C04) is **not** announced on any official page;
a third-party blog claiming it conflicts with the official guide.

Sources:
- Cert page: https://aws.amazon.com/certification/certified-solutions-architect-associate/
- Exam guide: https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html
- Domains: …/solutions-architect-associate-03-domain1.html … domain4.html
- In scope: …/saa-03-in-scope-services.html · Out of scope: …/saa-03-out-of-scope-services.html

## Format
- 65 questions (50 scored + 15 unscored, not identified), 130 minutes. Scaled 100–1000, pass 720, compensatory.
- Multiple choice: 1 correct + 3 distractors. Multiple response: 2+ correct out of 5+ options.
- No penalty for guessing; unanswered = wrong. No other question types officially listed.
- Style: a 2–5 sentence business scenario, then a qualifier: "MOST cost-effective", "LEAST operational
  overhead", "MOST secure", "with the LEAST latency", "highly available". Distractors are real services
  that work but miss the qualifier (more ops work, more cost, single-AZ, not serverless, wrong scope).

## Domains (variant mix for 65 questions: 20 / 17 / 15 / 13, ±1)
- **secure — Design Secure Architectures, 30%**: 1.1 secure access to AWS resources (IAM, roles, SCPs,
  Identity Center, cross-account, federation); 1.2 secure workloads and applications (VPC security, SGs/NACLs,
  WAF, Shield, Cognito, Secrets Manager, endpoints); 1.3 data security controls (KMS, encryption at rest/in
  transit, ACM, backups, retention, Macie).
- **resilient — Design Resilient Architectures, 26%**: 2.1 scalable, loosely coupled (SQS, SNS, EventBridge,
  Step Functions, Lambda, API Gateway, containers, caching); 2.2 highly available / fault tolerant (Multi-AZ,
  Route 53 failover, Aurora Global, DR strategies: backup-restore, pilot light, warm standby, multi-site;
  RPO/RTO).
- **performance — Design High-Performing Architectures, 24%**: 3.1 storage (S3, EBS types, EFS, FSx);
  3.2 compute (EC2 families, Auto Scaling, Lambda, Fargate, Batch); 3.3 databases (RDS, Aurora, read replicas,
  DynamoDB + DAX, ElastiCache, RDS Proxy); 3.4 network (CloudFront, Global Accelerator, Direct Connect,
  Transit Gateway, placement groups); 3.5 ingestion and transformation (Kinesis, Data Firehose, Glue, Athena,
  EMR, Lake Formation, DataSync, Snow Family).
- **cost — Design Cost-Optimized Architectures, 20%**: 4.1 storage (S3 classes, Intelligent-Tiering,
  lifecycle, Glacier tiers, EBS gp3); 4.2 compute (Savings Plans, Reserved, Spot, right-sizing, Compute
  Optimizer, Graviton); 4.3 database (Aurora Serverless, DynamoDB on-demand vs provisioned, caching);
  4.4 network (NAT gateway vs endpoints, data transfer, CloudFront offload).

## In scope (non-exhaustive)
Analytics: Athena, Data Firehose, EMR, Glue, Kinesis, Lake Formation, MSK, OpenSearch, Amazon Quick
(formerly QuickSight), Redshift. App integration: AppFlow, EventBridge, MQ, SNS, SQS, Step Functions.
Compute: EC2, Auto Scaling, Batch, Elastic Beanstalk, Outposts, Wavelength, ECS, EKS, ECR, Fargate, Lambda.
Database: Aurora (+ Serverless), DocumentDB, DynamoDB, ElastiCache, Keyspaces, Neptune, RDS, Redshift.
Network: VPC, ELB, CloudFront, Global Accelerator, Route 53, Direct Connect, Site-to-Site VPN, Client VPN,
PrivateLink, Transit Gateway. Security: IAM, IAM Identity Center, KMS, ACM, CloudHSM, Cognito, GuardDuty,
Macie, Inspector, Detective, Shield, WAF, Firewall Manager, Network Firewall, Secrets Manager, Security Hub,
RAM, Directory Service, Artifact. Storage: S3, S3 Glacier, EBS, EFS, FSx, Storage Gateway, AWS Backup.
Migration: DMS, DataSync, Application Migration Service, Snow Family, Transfer Family. Management:
CloudFormation, CloudTrail, CloudWatch, Config, Control Tower, Organizations, Systems Manager, Trusted
Advisor, Compute Optimizer, Service Catalog. Cost: Budgets, Cost Explorer, CUR, Savings Plans.
ML: Comprehend, Lex, Polly, Rekognition, SageMaker AI, Textract, Transcribe, Translate.

## Do not write questions on
- Out of scope: CodeCommit/CodeBuild/CodeDeploy/CodeArtifact, CDK, CloudShell, FIS, Lightsail, Cloud Map,
  MWAA, IoT, Elemental/IVS, Braket, Ground Station, GameLift, Managed Blockchain, Personalize, DevOps Guru,
  Location Service.
- Closed or ending (don't make them a correct answer): S3 Select, Cloud9, CloudSearch, SimpleDB, Data Pipeline,
  Forecast (closed to new customers 2024, press reports), Timestream for LiveAnalytics (closed to new customers
  2025-06-20), Pinpoint and Inspector Classic (end of support announced).
- Use current names: Amazon Quick (not QuickSight), SageMaker AI, Data Firehose (not Kinesis Data Firehose).
- Service defaults that changed (S3 default encryption SSE-S3 since 2023-01, Block Public Access + ACLs
  disabled on new buckets since 2023-04): state them only if you are sure; otherwise avoid the item.

## Fact-check findings (2026-10-15, researcher, official docs)
- **Snow Family is closed to new customers since 2025-11-07** (Snowball Edge included):
  https://docs.aws.amazon.com/snowball/latest/developer-guide/snowball-edge-availability-change.html.
  Never key it. For "link too slow", key added network capacity that can arrive in time (a hosted Direct Connect
  connection from a partner) + DataSync, and say in `explain` that older material keys Snow devices.
- **Database Savings Plans** exist since 2025-12-02 (1-year; RDS, Aurora, DynamoDB, ElastiCache, …). Compute Savings
  Plans still don't cover RDS.
- S3 Replication Time Control: **99.9%** of objects within 15 minutes (docs + SLA), not 99.99%.
- Aurora Serverless v2 can scale to **0 ACU** (auto-pause) on recent engine versions.
- gp3 max is now 80,000 IOPS / 2,000 MiB/s; io2 Block Express 256,000 IOPS. EFS Max I/O is a previous-generation
  mode: don't use it, even as a distractor (use Elastic throughput).
- Aurora Global Database: say failover "within minutes", not "under 1 minute".
- `aws:SourceIp` is absent from the request context for VPC endpoint requests (use `aws:SourceVpce`/`aws:SourceVpc`).
- Services moving to maintenance (2026-06-30 list): Kendra, Cognito Sync, Simple AD. Don't key them.
