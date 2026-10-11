---
name: side-effect-jobs-must-not-fail-after-send
description: "Queue jobs that send something irreversible (push, email, SMS) must not fail after the send succeeded, because the queue retries and the user gets duplicates. Also: enqueue only after the DB transaction commits, and swallow enqueue errors."
metadata:
  type: project
---

The shape that works for "notify the user when X happens" with a job queue (BullMQ etc.):

1. **Enqueue after the transaction commits**, not inside it. Inside means a push for a
   rollback. Check there is no *outer* transaction wrapping the call, or "after commit" is a lie.
2. **Enqueue failure must not fail the business action.** Wrap it, log it, and move on.
   An admin's approve shouldn't 500 because Redis blinked.
3. **One jobId per business event** (`<event>-<entityId>`) so a double click can't queue twice
   while the first job is pending. The entity's own state guard (e.g. "only PENDING can be
   reviewed" → 409) is the real dedupe.
4. **After the send, nothing may throw.** Bookkeeping that runs after a successful send
   (delivery counters, audit rows) must catch its own errors. Otherwise the job fails,
   the queue retries, and the retry re-sends to every device that already got the message.
   Per-recipient provider errors come back *inside* the batch response, so they don't trigger
   a retry. Only whole-batch failures should.
5. Counter updates on rows that another system reads by `updatedAt` need `silent: true` (or
   the equivalent), or the counter write silently changes that system's "fresh rows" filter.

**Evidence:** 2026-10-02, review-result push notifications. The background reviewer caught #4
(`Promise.all` of counter UPDATEs after `sendEach`). #5 came from a sibling batch job that
selects tokens by `updatedAt` within a month.
