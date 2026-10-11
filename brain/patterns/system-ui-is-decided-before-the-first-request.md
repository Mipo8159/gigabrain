---
name: system-ui-is-decided-before-the-first-request
description: "Before asking 'can the backend change what the user sees', check the order of events: OS UI shown before the first request is decided by the client and the OS. Example: the iOS 'wants to use X to sign in' dialog shows the start-URL host; an ephemeral auth session removes it."
metadata:
  type: project
---

**Question asked:** a product owner wanted the iOS OAuth consent dialog
("App wants to use <domain> to sign in") to show the brand domain instead of a
long backend host. Can the backend change it?

**How to settle it:** put the events in order. `ASWebAuthenticationSession`
(Expo `openAuthSessionAsync`) shows the dialog when the session starts, before
any request leaves the phone. So no response, header or redirect can affect it.
The domain comes from the start URL, which the client builds. The backend
answer was a firm "no role", reached without a device, from the order of events
plus confirming the server never reads its own Host.

**What the client *can* do (the mobile dev first said "nothing"):**
- `preferEphemeralSession: true` → no shared Safari cookies → iOS has nothing to
  ask consent for, so no dialog. Cost: no Safari SSO, so the user re-picks the account.
- Point the start URL at a branded host (DNS + TLS + reverse proxy to the API).
  Safe if the server builds redirect/callback URLs from config or state, not the Host header.
  iOS may still shorten the host to the registrable domain.
- A native provider SDK gets rid of the sheet, but needs a backend endpoint that
  verifies an ID token. Embedded WebViews are blocked by Google (`disallowed_useragent`).

**Rule:** for "can layer X change this UI", first find who renders it and when
relative to the first request. "Can't do anything" from one layer usually means
nobody has traced which layer owns the string.

Status: the ephemeral-session behaviour comes from docs, and was not yet checked
on a device in that session.
