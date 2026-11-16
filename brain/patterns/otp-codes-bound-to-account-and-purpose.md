---
name: otp-codes-bound-to-account-and-purpose
description: Before building on an existing one-time-code (OTP) flow, check that a code is stored with its owner and purpose. A table that keeps only the code, checked as "any live code", lets anyone's code act on any account. Checklist for the fix (atomic attempt claim, per-account budget, uniform responses).
metadata:
  type: feedback
---

**In short:** an OTP is only safe if it is looked up by (account, purpose), never by code alone.

A legacy service stored rows with just the code and an expiry, and verified with "is there any live row with
this code?". The endpoint took `{userId, code}`, so a code mailed to one account returned tokens for any
other, including an admin. Nobody noticed because in normal use the code always belonged to the caller.

**Why:** found 2026-11-16 while adding passwordless login on top of the existing OTP service (work repo).
Reproduced locally before the fix (tokens for user 1). No test, lint or code review had flagged it in
the months it was live. A background reviewer then found four more holes in the first fix, all real.

**How to apply:** when a task touches an OTP/magic-link/reset flow, read the verify query first. The fix that
held up under a curl suite:
- store `userId` + `purpose`; issue cancels older codes for the same pair; verify only the latest one;
- count the attempt **before** comparing, in one `UPDATE … WHERE attempts < N AND expires_at > now() RETURNING code`
  (40 parallel wrong guesses then still stop at N; a read-then-update lets them all through);
- a per-account rolling budget (codes issued and wrong guesses), since a per-code cap resets with every new code;
- a resend cooldown that a locked code does not hold;
- the request endpoint answers identically whether or not the account exists; restrict passwordless login to
  low-privilege roles if admins have a password path;
- any older "verify by code only" endpoint must be scoped so it can't consume the new bound codes.

**Signal:** a feature request "log in / reset / confirm with a code" on an existing codebase, or an `otps`-style
table without an owner column.
**Next time:** grep the verify path, reproduce cross-account use with two local users before writing the feature,
and add the six items above as the proof list.
