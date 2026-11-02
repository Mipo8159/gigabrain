---
name: probe-a-locked-api-by-its-error-order
description: "A third-party API answers 403 from your machine: send a same-format decoy key and an unknown route to learn the server's check order and prove the real key is valid, then retest from the host whose outbound IP is allowlisted. An opaque hex key has no readable expiry."
metadata:
  type: feedback
---

**Rule:** before reporting "the key doesn't work" or "we need access", map what
the server checks and in which order, using requests that can't do harm.

**Why:** 2026-11-02, a client handed over an API key plus four `curl` examples
and asked "is it intact, does it expire?". From the laptop every endpoint gave
403 "IP not permitted". Three cheap requests separated the causes:
- no key → 401 "missing header" (auth is enforced)
- random key, same format → 401 "invalid key" (so the real key *is* recognised;
  the 403 is the IP gate)
- real key, made-up route → 404 (route check runs before IP, so the four paths exist)

Then the same calls from the server whose **outbound** IP was on the allowlist
returned 200 (except one endpoint that 500s for everyone, which is the vendor's bug).
No new service was needed to test; one `curl` from the allowed host was enough.

**How to apply:**
1. Store the key in a `curl -K` config (mode 600) or pipe it over stdin to the
   remote host (`printf 'header = …' | ssh host 'curl -K - …'`), never in argv.
2. Run: no key · decoy key (`secrets.token_hex(n)` of the same length) · real
   key on a made-up route · real key on the real routes. Compare the messages.
3. 403 + "IP" wording → find the allowlisted host and test from it. Measure its
   *outbound* IP (`curl api.ipify.org` on it); inbound and outbound often differ.
4. Expiry: a 64-hex (or other random) key has no claims to decode. Only a JWT
   (`xxx.yyy.zzz`) carries `exp`. Otherwise expiry is server-side: ask the owner,
   and alert separately on "invalid key" vs "IP blocked".
5. Pasted `curl` lines often carry smart quotes (`“ ”`). The shell splits the
   header, so it gives a "malformed header" error, and curl may treat the key
   as a hostname (DNS lookup). Retype with straight quotes before running.

**Signal:** "check this API key / token", a 401/403 from a client or vendor API, "is this token expirable".
**Next time:** run the 4-request matrix above first, then answer validity, access and expiry as three separate facts.
Related: [[vendor-ip-lists-label-direction-from-their-side]], [[pii-api-data-profile-then-export]].
