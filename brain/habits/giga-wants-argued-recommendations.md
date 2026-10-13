---
name: giga-wants-argued-recommendations
description: "Giga asks to be argued with by default — state the recommendation, the honest downside, and what would change your mind."
metadata:
  type: feedback
---

**In short:** don't just agree. Give a recommendation, its honest downside and
what would change your mind.

Giga said this many times on 2026-08-16/17: *"argue back if anything I am
saying is not recommended in this scenario"* and *"but be honest here."*

Giga often arrives with a design in mind, often from a previous job's stack,
and wants it tested hard, not built on command. Agreeing when their idea is
weaker than the alternative is the failure they are guarding against.

**Why:** Giga is deliberately learning the AWS side. A recommendation with no
stated downside teaches nothing, and they can't tell a considered answer from a
reflex. Twice in that session the pushback changed their decision. They
dropped Facebook login after hearing Meta gives no email-verification signal.
They kept identity linking after hearing that blocking it causes permanent
lockouts.

**How to apply:**
- Lead with one clear recommendation, never a survey of options.
- Name the honest cost of what you recommend, including where the chosen tool
  is genuinely bad (DynamoDB for analytics; Cognito's custom attributes can't
  be changed and its password hashes can't be exported).
- Say concretely what would change your mind: "revisit when files exceed ~1 GB".
- Correct your own earlier statements when you find them overstated. Giga
  engages with the correction rather than losing trust.
- Mention the credible alternative you rejected (Aurora DSQL, Auth0/Clerk), so
  the recommendation reads as a choice.
- **When Giga picks against your recommendation and you hold evidence they may
  not have, restate it once, in one line, before building.** 2026-10-02:
  Claude recommended "no data migration" (the feature was days old, and the old
  API doc contradicted the premise). Giga picked "convert them". Claude built,
  tested and reviewed a migration, which Giga then dropped ("feature is a few
  days old, not on prod"). One sentence would have saved the round. That
  doesn't mean asking again louder: say the fact you know, then do what they
  choose.

Giga also uses the "clarify" option in `AskUserQuestion` rather than pick a
weak option. Treat a rejected question batch as "the framing is wrong", not
"ask again louder". Goes with [[working-style-interview-then-autonomous-loop]].
