---
name: giga-wants-argued-recommendations
description: "Giga asks to be argued with by default — state the recommendation, the honest downside, and what would change your mind."
metadata:
  type: feedback
---

Stated repeatedly on 2026-08-16/17, in their own words: *"argue back if anything
I am saying is not recommended in this scenario"* and *"but be honest here."*

They arrive with a design already in mind (often from a previous job's stack) and
want it stress-tested, not implemented on command. Agreeing when the idea is
weaker than the alternative is the failure mode they're guarding against.

**Why:** they are explicitly learning the AWS side. A recommendation with no
stated downside teaches nothing and they cannot tell a considered answer from a
reflexive one. Twice this session the pushback changed their decision — they
dropped Facebook after hearing Meta exposes no email-verification signal, and
kept identity linking after hearing that blocking creates permanent lockouts.

**How to apply:**
- Lead with a clear recommendation, never a survey of options.
- Name the honest cost of the thing you're recommending, including where the
  chosen tool is genuinely bad (DynamoDB's analytics story, Cognito's immutable
  custom attributes and unexportable password hashes).
- Say what would change your mind, concretely — "revisit when files exceed ~1 GB".
- Correct your own earlier statements when you find them overstated; they engage
  with the correction rather than losing trust.
- Mention the credible alternative you rejected (Aurora DSQL, Auth0/Clerk) so the
  recommendation reads as a choice.

- **When Giga picks against your recommended option and you hold evidence they
  may not have, restate it once, in one line, before building.** 2026-10-02:
  Claude recommended "no data migration" (the feature was days old, and the old
  API doc contradicted the premise), Giga picked "convert them", and Claude built,
  tested and reviewed a migration that Giga then dropped ("feature is a few days
  old, not on prod"). One sentence would have saved the round. Not "ask again
  louder" — say the fact you know, then do what they choose.

They also use the "clarify" path on `AskUserQuestion` rather than picking a weak
option — treat a rejected question batch as "the framing is wrong", not "ask again
louder". Pairs with [[working-style-interview-then-autonomous-loop]].
