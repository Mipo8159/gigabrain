---
name: presentation-urls-echo-into-writes
description: "An API that returns signed/CDN URLs and accepts URLs on update will get its own presentation URLs echoed back; compare by storage key, never by URL string. Also: 'bigger files fail' often means 'slower async processing', not a size limit."
metadata:
  type: project
---

**Symptom:** updates began returning 500 right after list responses started
returning CDN-signed URLs instead of raw storage URLs. The DB error was
`value too long for type character varying(255)`.

**Cause:** the mobile client sends back the URL it received from the list
endpoint, even when the media did not change. The update path treated every URL
as a new upload and stored the signed URL (with Expires/Policy/Signature in the
query string) in a varchar(255) column. Before the change the raw URL fitted, so
the echo was a silent duplicate-media bug that nobody saw. Upstream originals
also expire after a day, so even a short echoed URL would have failed one day later.

**Fix:** derive the storage key from `new URL(url).pathname`. If it ends with
`/<currentKey>`, the media is unchanged, so skip creating media. This holds for
signed, expired, path-style or virtual-host URLs alike.

**Rule:** once an API hands out presentation URLs (signed, CDN, expiring),
assume clients will post them back. Identity is the storage key.

**Second lesson from the same session: "bigger fails" is often "slower".**
Long videos "didn't play" in the review panel, while short ones did. The upload
and the transcode were both fine. The reviewer opened the item 10–15 s after
upload, but the transcode takes about 2 min (plus cross-region replication
before the CDN origin has it). Short clips finish in seconds, which hid the race.
Diagnose by laying three timestamps side by side: submitted, viewed, job complete.
Fix it in the UI by showing a "processing" state off the existing converted flag.

**Debug moves that paid off:** grep the logs for the **driver error code**
(e.g. Postgres 22001) instead of the app's generic "Failed to create X". For a
CDN, an unsigned request returning `MissingKey` is *not* the same error as
`NoSuchKey`.

Related: [[steer-parallelism-and-agent-roles]].
