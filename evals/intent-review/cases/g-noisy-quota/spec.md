# CP-180 Upload quota by creator grade

Creators have a grade: `RESTRICTED`, `DEFAULT` or `PREMIUM`.

- AC1 A creator may have at most this many `PENDING` items at once: RESTRICTED 3, DEFAULT 20, PREMIUM **unlimited**.
- AC2 Creating content over the limit returns 429 and stores nothing. This applies to every create path: mobile, and admin uploading on a creator's behalf (the creator's quota counts, not the admin's).
- AC3 Approved, rejected and deleted items don't count toward the quota.
