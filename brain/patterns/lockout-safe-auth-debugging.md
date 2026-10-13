---
name: lockout-safe-auth-debugging
description: "When a directory/NTLM login fails, every retry spends a lockout attempt. Stop after one, diff the config's shape (key names, lengths) against the client that works, and copy that client's driver and settings before trying again."
metadata:
  type: feedback
---

**In short:** every failed login on a domain or Windows (NTLM) account spends a lockout
attempt. After one failure, stop guessing name formats. Compare the config's
**shape** with the client that already works (before the second attempt), then
make one deliberate attempt.

**Why:** 2026-10-04: a read-only SQL login failed four times in a row with "untrusted domain". The real
cause was a stray `DOMAIN=` line with an unrelated 42-character value, which the working GUI client
didn't send. Two attempts went to guessing `DOMAIN\user` vs `user@domain`, one to swapping drivers
(FreeTDS vs the vendor JDBC driver; that mattered too, as FreeTDS NTLM failed where the vendor driver
worked). Checking the config's shape would have found it first try.

**How to apply:**
1. Read the working client's saved connection settings (driver, auth mode, domain field), never its stored secrets.
2. Inspect the credential file by **shape only**: key names, value lengths, "has `@`/`\`", "empty?". Never values.
3. Use the same driver the working client uses (e.g. the vendor JDBC jar it already downloaded).
4. Failures *before* the login step (TLS or certificate errors, connection timeouts) don't cost lockout attempts. Fix those freely.
5. Say "one attempt, then I stop" up front, and keep to it.

**Signal:** "Login failed", 18452/18456, "untrusted domain", any LDAP/NTLM/Kerberos auth error.
