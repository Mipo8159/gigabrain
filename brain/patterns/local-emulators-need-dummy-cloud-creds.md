---
name: local-emulators-need-dummy-cloud-creds
description: "A service pointed at a local AWS emulator (DynamoDB local, fake S3, ElasticMQ) with NO credentials set makes the SDK walk the credential chain to the EC2 metadata endpoint: ~5s, then CredentialsError. Under a short local timeout (sls-offline 6s) it looks like a hang. Give it dummy creds (AWS_ACCESS_KEY_ID=local); real AWS rejects them."
metadata:
  type: feedback
---

**In short:** when a container talks to a local AWS emulator, give it
dummy credentials. Without any credentials it doesn't fail fast. It spends
about 5 s probing the EC2 metadata endpoint, which doesn't exist on a laptop,
and only then throws `CredentialsError`.

**Why:** the endpoint override (`DYNAMODB_ENDPOINT`, `--endpoint-url`) only
changes *where* requests go. The SDK still has to sign them, so it walks the
credential chain: env vars, profile files, container role, then EC2
metadata. The metadata step is what times out. With a short handler timeout
around it (6 s in serverless-offline), the symptom is "the request times
out", and the logs show no error at the emulator call.

**How to apply:**
1. Symptom: a local lambda or service times out at a little over 5 s, and
   the last log line comes just before a DynamoDB, S3 or SQS call.
2. Prove it in the running container without a restart: run the same SDK
   call with and without `-e AWS_ACCESS_KEY_ID=local -e
   AWS_SECRET_ACCESS_KEY=local` and time both. 2026-10-22: 5,012 ms
   CredentialsError vs 21 ms OK.
3. Fix it in the personal compose override, not the shared file: an
   `environment:` block with the two dummy values. Real AWS rejects them,
   so the fix can't touch a real account.
4. Never "fix" it by loading real cloud creds into an emulator-only service.
   That turns a local bug into a path to a real account.

**Signal:** a local service using an AWS emulator times out at ~5–6 s,
with no emulator error in its logs.
**Next time:** list the container's env key names (`env | cut -d= -f1 | grep
-i aws`). If there's no `AWS_ACCESS_KEY_ID`, run the timing probe, then add
the dummy creds.

Related: [[prove-integration-without-real-target]], [[first-test-run-on-a-restored-local-env]]
