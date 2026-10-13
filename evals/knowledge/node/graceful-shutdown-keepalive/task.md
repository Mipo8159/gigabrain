---
timeout: 600
---
Our API (`node src/main.ts`, port from `PORT`) runs on Kubernetes. On every rollout the old pods get SIGTERM and die
on the spot, so callers see connection resets on requests that were in progress (`/slow` is the usual victim).

Add graceful shutdown to `src/main.ts`:

- On SIGTERM, stop accepting new connections.
- Requests already in flight finish normally (their callers get the full response).
- The process exits with code 0 as soon as the in-flight work is done. The rollout waits for the old pod to exit, so
  it shouldn't hang around after that.

Our callers are other internal services using keep-alive HTTP agents. Keep the `listening <port>` startup line on
stdout (the deploy scripts read it), and keep `createApp()` in `src/app.ts` as is.
