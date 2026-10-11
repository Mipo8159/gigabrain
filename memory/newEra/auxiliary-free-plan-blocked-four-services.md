---
name: auxiliary-free-plan-blocked-four-services
description: "SOLVED 2026-08-18: MediaConvert, Transcribe, Translate and Route 53 Domains all failed in account 755352605221 because it was on AWS's new Free ACCOUNT PLAN, not because of IAM, SCPs or per-service activation. Upgrading to the paid plan cleared all four instantly."
metadata:
  node_type: memory
  type: project
  modified: 2026-08-18T14:00:00.000Z
---

## SOLVED — it was the Free account plan the whole time

Account 755352605221 was signed up on AWS's post-2025 **Free account plan**,
which grants "access to *select* AWS services" only. Four services were blocked:

| Service | Error it gave |
| --- | --- |
| MediaConvert | `SubscriptionRequiredException: The AWS Access Key Id needs a subscription` |
| Transcribe | same |
| Translate | same |
| Route 53 Domains | `AccessDeniedException: **Free Tier accounts are not supported for this service**` |

**Only Route 53 Domains named the real cause.** The other three threw
`SubscriptionRequiredException`, which reads like a per-service activation
problem and sent us down a completely wrong path.

**The user found it**, by trying to buy a domain and reading that error — not
from any diagnostic I ran.

## ⚠️ The wrong turn, recorded so it is not repeated

I diagnosed at length and concluded "not fixable from a keyboard, open a support
case." **That was wrong.** It was entirely self-service. Case
`178700559400974` was filed 2026-08-18 02:26 and became moot ~13h later.

I also earlier told them "open the MediaConvert console once and it clears" —
also wrong. Two bad calls on the same problem.

**The corrected rule:** `SubscriptionRequiredException` on a *brand-new-ish*
account is far more likely to be the **account plan** than per-service
activation. Check the plan FIRST — before IAM, before SCPs. The cheap probe:

```
aws route53domains check-domain-availability --domain-name example.com --region us-east-1
```

Route 53 Domains is the canary: it is restricted on the Free plan and it says so
in plain words. IAM simulate and `organizations describe-organization` returning
"allowed"/"not in use" prove nothing about plan restrictions.

## The fix

Console -> https://console.aws.amazon.com/billing/home?#/freetier/upgrade
-> Upgrade plan -> Upgrade account. **Needs the ROOT user**; as `iamadmin` the
page returned only "An error occurred while processing your request."

## What upgrading changed, and the risk it introduced

- Remaining sign-up credits carry over to future bills; nothing forfeited.
- **The Free plan would have CLOSED the account** at 6 months or credit
  exhaustion, with 90 days to retrieve data. That timer is now gone.
- **No downgrade is possible, ever**, and there is now no automatic spend
  ceiling. Spend was $0.00 for July and August.
- ⚠️ **A budget alarm was recommended and NOT yet created.** That is the only
  guardrail replacing the old hard stop. Do it.

`auxiliary.com` is UNAVAILABLE (taken).

Related: [[auxiliary-upload-pipeline-plan]], [[auxiliary-is-the-app-auctionize-is-legacy]]
