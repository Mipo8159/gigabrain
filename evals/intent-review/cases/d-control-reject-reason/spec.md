# CP-150 Admin rejects a submission with a reason

- AC1 `POST /admin/content/:id/reject` with body `{ reason }`. The reason is required: after trimming it must be non-empty and at most 500 characters, otherwise 400.
- AC2 Only `PENDING` content can be rejected; anything else returns 409 and changes nothing. Request validation (AC1, 400) is checked first.
- Admin-only access is out of scope: every `/admin/*` route is already mounted behind the admin guard in the router.
- AC3 On success the content's status becomes `REJECTED` and the trimmed reason is stored in `rejectionReason`. No reel or lesson is created.
