---
name: keepalive-socket-dies-during-blocking-work
description: "Node fetch after seconds of synchronous CPU work reuses a kept-alive socket the server already closed → UND_ERR_SOCKET; retry idempotent requests on connection-level codes"
metadata:
  type: feedback
---

**Rule:** in a Node service that does HTTP calls, then seconds of synchronous work (a big transform, hashing,
JSON of 100k rows), then more HTTP calls to the same host, the next call can fail with `TypeError: fetch failed`,
cause `UND_ERR_SOCKET` ("other side closed"). Retry idempotent requests (GET) on connection-level codes
(`UND_ERR_SOCKET`, `ECONNRESET`, `EPIPE`, `UND_ERR_CLOSED`) two more times; never retry on timeouts, aborts or
HTTP errors, and keep only the error's name + code in the message (the request header holds the key).

**Why:** the server (Apache: 5 s idle keep-alive, measured with python `http.client` + sleep) closes the idle
socket while the event loop is blocked, so Node neither processes the FIN nor runs its own 4 s keep-alive timer;
the first fetch after the block picks the dead socket. 2026-11-19: every read of a new API endpoint on production
failed this way (6 of 6 runs), while curl from the same host and the same reads without the blocking step worked.
Reproduced in the production Node image: 8 s busy loop → `UND_ERR_SOCKET`; 3 s busy loop or 8 s `setTimeout` → ok.
A `setTimeout` pause in a repro hides it: block the loop (`while (Date.now() < end);`).

**How to apply:** when a fetch error shows up only in the real pipeline, check what runs synchronously before it.
Reproduce with the production Node version (`docker run node:<prod version>`), the real host through an SSH
tunnel (`ssh -L 8443:host:443` + `--add-host host:127.0.0.1`) when it is IP-allowlisted, and a busy loop.
Test the retry with a local server that `req.socket.destroy()`s the first request.
**Signal:** `fetch failed` / `UND_ERR_SOCKET` / `other side closed` in a job that works from curl or in isolation;
an HTTP call placed after a heavy in-process step.
**Next time:** add the connection-level retry to every GET adapter up front; repro with a blocked loop, not a sleep.
Related: [[unheard-error-event-kills-node]]
