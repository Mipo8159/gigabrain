---
name: prove-integration-without-real-target
description: "How to prove a third-party send (push/email/payment) works when no real target (device token, inbox, card) is available: build the production image, run the provider's dry-run against a broadcast target, read the error order, and check researcher claims against the installed SDK's typings."
metadata:
  type: project
---

"It builds and the unit path ran" isn't "it will work when deployed." Close the gap in layers:

1. **Packaging:** build the real production Dockerfile locally. A `npm ci --only=production`
   stage, a Node version floor (firebase-admin 14 needs Node ≥ 21) or a generated
   package.json can drop a dependency that dev mode had. Then run a one-liner inside the image
   (`docker run --entrypoint node <img> -e "require('<pkg>/<subpath>')"`).
2. **Provider dry-run to a broadcast target:** e.g. FCM `sendEach(msgs, true)` to a *topic*.
   It goes through full auth, IAM and payload validation with no device and no delivery.
   That proves credentials and payload together.
3. **Error ordering as evidence:** a malformed target that comes back `INVALID_ARGUMENT`
   means auth already passed. Bad credentials fail earlier (401/403). Log `error.message`,
   not just the code, so a payload error and a target error can be told apart.
4. **Infra in parallel:** a read-only verifier agent checks egress (subnet → NAT/IGW, SG),
   secret IAM (`simulate-principal-policy`), and that a sibling system already sends
   successfully with the same credentials.
5. **Researcher answers marked "doc-knowledge" are hypotheses.** The installed SDK's `.d.ts`
   JSDoc mirrors the API reference. On 2026-10-02 it corrected the claim "unknown Android
   channel = notification dropped" (actually: FCM falls back to the manifest channel).
6. **Local-only layer, when no external call is allowed** (2026-10-05): run the SDK's own
   payload validator offline on the exact message the service builds, plus a **control case**
   it must reject (FCM: a numeric `data` value), so the check can't pass vacuously. A queue
   with `removeOnComplete` keeps no payload to inspect, so capture the job as it is written with
   `redis-cli MONITOR` during the run. Use targets with no tokens so the worker completes with
   `sent:0` and nothing leaves the machine. An ORM getter can be what keeps an INTEGER id a
   string in the payload. Name it, because deleting it breaks every send silently when the
   send errors are swallowed.
7. What stays unprovable without a device: OS display (foreground handling), the iOS APNs key
   in the provider console, and real token validity. Name them as owner-side checks.
