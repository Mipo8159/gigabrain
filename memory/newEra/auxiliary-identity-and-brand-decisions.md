---
name: auxiliary-identity-and-brand-decisions
description: "Two settled auxiliary decisions from 2026-08-18: symmetric sign-up blocking replaced the identity-linking feature, and the misspelled name became the logo via a dotted l — plus the dark-committed editing-suite design direction."
metadata: 
  node_type: memory
  type: project
  originSessionId: ae2d0a4b-78f7-4f20-adb5-7dc3bc21e90d
  modified: 2026-08-17T22:29:20.716Z
---

## One email, one account — linking was deleted, not fixed

The `PreSignUp` identity-linking service (Google → native `AdminLinkProviderForUser`)
**never once worked** in practice: it links only in the native-first direction,
and the user tested Google-first, producing two `sub`s for one address. Rather
than extend it, they chose **symmetric blocking**:

> "if email is registered with native, socials are not permitted and vice versa,
> error message: email is already registered."

Now `signUpGuard.service.ts` (~50 lines, was ~110). One `ListUsers` lookup in
`PreSignUp` closes both doors, because the trigger runs *before* Cognito creates
anything, so anything found pre-dates the sign-up. The `email_verified` guard
went with it — it existed to make *linking* safe, and nothing links now.

**Known cost, accepted:** a Google-first user can never set a password. The
escape hatch, if ever wanted, is an authenticated "add a password" flow — not
sign-up, where you cannot prove who is asking. I argued for asymmetric
(link Google→native, block the reverse) and they chose symmetric; that is
settled, do not relitigate.

**Presentation asymmetry, not a bug:** a blocked *password* sign-up renders
inline on the hosted UI form; a blocked *Google* sign-in bounces to a Cognito
error page, because there is no form to render it in.

## The misspelling WAS the logo -- corrected 2026-08-18

**On 2026-08-18 they chose to fix the spelling everywhere** — folder, table,
SSM, code, docs. The logo idea survived the fix instead of dying with it.

Originally the typo WAS the mark: the `l` carried a tittle where the missing
`i` should have been, drawn as a **play triangle** because this is a video tool.
Correcting the spelling gave that triangle a legitimate home — "auxiliary" has a
real `i` right after the `l` — so `Wordmark` now renders `auxil` + **`ı`
(U+0131, dotless i)** + `ary`, with the triangle as that letter's actual tittle.
Same silhouette, same joke, no longer a typo.

The dotless `ı` is load-bearing: overlay a triangle on a normal `i` and you get
two tittles, and no CSS suppresses a glyph's own dot. Known trade-off, accepted:
**copying the wordmark yields "auxılary"**; the correct spelling lives on
`aria-label` and in `<title>`.

⚠️ **The triangle's placement is UNVERIFIED.** `tick = size*0.24` and
`top = -size*0.02` against a `lineHeight: 1` box are computed font metrics, never
seen rendered — the Chrome extension was not connected on 2026-08-18 either.
Those two constants in `Logo.tsx` are the only things to nudge if it sits wrong.

Live text, not a drawn path, so it stays selectable and crisp. A square `Glyph`
variant serves the favicon (inlined as an SVG data URI) and was NOT changed.

## Design direction: editing suite, dark-committed

Chosen from three options I offered. `web/src/index.css` **deletes the light
theme on purpose** and says so — every tool this sits beside is dark because a
bright UI beside video frames wrecks the colour read. Two hues carry meaning and
must not become decoration: **signal** (mint-cyan `#3ee0c4`, the waveform hue)
for interactive/resolved, **amber** (`#f0b45f`) for work in progress — which maps
onto the job states `queued | transcoding | transcribing | done | failed`.

Also settled: **custom sign-in form over the hosted UI**, which finally uses the
`POST /register` and `POST /login` endpoints that had been deployed since day
one and never called by the SPA. Google necessarily stays a redirect. Cognito
errors are rewritten for humans in `web/src/auth/api.ts`.

⚠️ **Untested seam I introduced:** a session obtained via `POST /login`
(`InitiateAuth`, PascalCase tokens) refreshes through the *OAuth* `/oauth2/token`
endpoint. Same client, so it should work — but it only fails 59 minutes in.
Force it early by setting `expiresAt` in `sessionStorage` to the past and
reloading.

⚠️ **I never saw any of this rendered** — the Chrome extension was not connected.
Confidence rests on typecheck, a clean `vite build`, and confirming all 13 theme
utilities exist in the compiled CSS. Nobody has visually reviewed it.

Related: [[auxiliary-is-the-app-auctionize-is-legacy]],
[[dont-strip-architecture-during-cleanup]].
