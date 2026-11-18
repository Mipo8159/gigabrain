---
name: unheard-error-event-kills-node
description: "A socket-based client object (DB driver connection, raw socket, stream) that emits 'error' with no listener crashes the whole Node process (exit 1), even when the awaited call already rejected. Attach .on('error') to every such object, and make start-up close runs the dead process left open."
metadata:
  type: feedback
---

**In short:** in Node, an `'error'` event with no listener is an uncaught
exception. Wrapping the call in a promise and `try/catch` does not help if the
library *also* emits `'error'` on the connection object.

**Why:** 2026-11-18, a NestJS exporter reading SQL Server with tedious. Every day
at 06:00 the DB stopped answering mid-query. tedious ended the pending request
with ECLOSE (our promise rejected, handled), then on the next tick emitted
`'error'` (`Connection lost - read ETIMEDOUT`) on the `Connection`. Nothing
listened, so Node exited 1, 16 days in a row, and the run row stayed
'running', which blocked new runs for the 2-hour stale window. No test covered
a socket drop mid-request; the mocked driver never emitted `'error'`.

**How to apply:**
- After `new Connection(...)` (tedious, `net.Socket`, ws, ssh2, any
  EventEmitter-based client) add `conn.on('error', e => record(e))` and let the
  awaited call reject with the recorded cause (wait one `setImmediate` so a
  `nextTick` error arrives first).
- Test it with a fake that reproduces the library's real order: request
  callback with the close error, then `process.nextTick(() => emit('error'))`.
  Check the test fails with the listener removed.
- Process guards in `main`: log uncaught exceptions and unhandled rejections,
  close the app (shutdown hooks mark the job failed), then exit 1 for a clean
  restart. Staying alive after an unknown error can leave a lock held forever.
- At start-up, while holding the job lock, fail every 'running' row: holding
  the lock proves none is live. A time-based stale window turns each crash
  into hours of refusals.
- Grep the container log for `Emitted 'error' event on` when a process dies
  with exit 1 and no app log line.

**Signal:** exit code 1 with no app error logged; a crash at a fixed time; a
DB/socket client constructed without `.on('error')`.
**Next time:** grep new code for `new Connection(` / `net.connect(` and check
an `'error'` listener sits next to it.

Related: [[prove-an-outage-from-the-hosts-own-records]].
