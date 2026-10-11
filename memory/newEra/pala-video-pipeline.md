---
name: pala-video-pipeline
description: pala/ turns a JSON spec into a narrated AWS explainer MP4; the contract in spec/ is the product, not the renderer.
metadata:
  type: project
---

`newEra/pala/` (started 2026-08-26) generates 60-second 9:16 AWS exam-prep videos.
Pipeline: `videos/<id>.json` → validate → Polly neural → Remotion → `out/<id>.mp4`.
First working video: `sqs-visibility-timeout`, 60.3s, ~90s to build end to end.

**Why:** Giga is sitting an AWS exam and wants Paladin-style explainer shorts to
learn from and to share. The goal is a repeatable way to ask *any* model for a
video and get one back — so the JSON contract in `spec/video-spec.md` is the
actual deliverable; the Remotion renderer is just one consumer of it.

**How to apply:**
- Polly **generative rejects speech marks** — must use `Engine: neural`. Word
  timings are structural: `revealAt` names a *word in the narration*, and
  `scripts/narrate.mjs` resolves it to milliseconds. Never hardcode a frame.
- The visual vocabulary is a **closed set of 7 types**. That is the anti-slop
  mechanism: a model cannot request an illustration, so it cannot draw a
  confidently-wrong diagram. Do not add a free-form image type.
- `scripts/validate.mjs` catches structure, never facts. Every number in the
  `gotcha` beat still needs checking against AWS docs by hand.
- Diagram edge geometry: offsets must be computed in a **canonical** (sorted-id)
  direction. Deriving them from edge direction makes the normal and the bow sign
  cancel on reverse edges, and both labels stack. Cost me two renders.
- Remotion is free for teams ≤3; if this becomes a Sweeft product it needs a
  paid licence. See [[auxiliary-is-the-app-auctionize-is-legacy]] — pala is
  separate from auxiliary for now, but is a natural producer for its pipeline.

**Bedrock is entitlement-blocked (as of 2026-08-26).** `list-foundation-models`
shows `anthropic.claude-opus-5` as ACTIVE, but every invoke returns
`403 permission_error` — listing is not access. Granting it is a console step
(Bedrock → Model access → Enable → Anthropic); there is no CLI verb for it in
aws-cli 2.22. Until Giga clicks it, `scripts/ask.mjs` cannot run and specs get
hand-authored instead. Use the **Mantle** client (`AnthropicBedrockMantle` from
`@anthropic-ai/bedrock-sdk`), not `AnthropicBedrock`, and plain `anthropic.*`
model ids — the `us.`/`global.` inference-profile ids return 404 there.

**Bedrock diagnosis, corrected 2026-08-26.** The earlier "grant model access in
the console" advice was WRONG — that page is retired; models auto-enable on
first invoke. Two separate things actually block this account:
1. **Anthropic use case form not submitted** → `ResourceNotFoundException:
   Model use case details have not been submitted`. Fix: Bedrock → Model
   catalog → an Anthropic model → Open in Playground → fill form → wait 15 min.
2. Claude 5 ids return `AccessDeniedException: not available for this account
   … contact AWS Sales`. I first read this as an account-plan wall — Giga
   corrected me, and the free-tier API shows no restricted plan. The failure
   splits EXACTLY on endpoint (all Mantle ids one way, all legacy ids the
   other), so it is probably the SAME use-case gate worded vaguely by the newer
   endpoint. UNRESOLVED until the form is submitted and Opus 5 retested.

**Two Bedrock endpoints, different catalogues.** `AnthropicBedrockMantle` (the
Messages endpoint) serves ONLY Claude 5 ids (`anthropic.claude-opus-5`) and
404s on anything older. `AnthropicBedrock` (legacy bedrock-runtime InvokeModel)
serves the rest via inference profiles (`us.anthropic.claude-sonnet-4-6`).
`ask.mjs` now picks the client from the id prefix. Default is Sonnet 4.6.

**Diagnose Bedrock with `invoke-model`, not the SDK** — the CLI returns the
real exception type; the SDK's 403 hid a use-case error behind a generic
permission_error, and a ThrottlingException masked it again on first retry.

**RESOLVED 2026-08-26 — pala runs on the `claude` CLI, not Bedrock.**
`ask.mjs` shells out to `claude -p --permission-mode bypassPermissions`, billed
to Giga's existing Claude subscription: no API key, no AWS entitlement, no
per-video model cost. Provider auto-detects: `claude` on PATH → claude-code
(default); `ANTHROPIC_API_KEY` → anthropic api; else Bedrock. Override with
`PALA_PROVIDER`. First fully automated video: `s3-presigned-url-expiry`.

**A Claude subscription is NOT an API key** — separate products, separate
billing. Giga asked to "use my subscription key"; there is no such key. The
CLI-as-provider trick is what actually spends the subscription.

**Bedrock findings stand but are now moot**: the newest generation (Fable 5,
Opus 5, Opus 4.8/4.7, Sonnet 5) returns "not available for this account" while
Opus 4.6 and older only need the use case form — same endpoint, so it IS
model-specific gating, not the endpoint confound I briefly claimed. Giga is not
on a free plan; cause unknown, and no longer worth chasing.

**Schema needs `discriminator`.** Without `{propertyName:"type"}` on the visual
oneOf (plus ajv `discriminator: true`), one bad field produced 35 errors as ajv
reported every branch — which would have poisoned the repair loop. With it: 1
precise error.
