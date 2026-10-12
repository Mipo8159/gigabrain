# CP-170 Creators can delete a pending submission

- AC1 `DELETE /content/:id` soft-deletes (sets `deletedAt`). Only the content's creator may delete it, and only while `PENDING`; otherwise 409.
- AC2 Deleted content no longer appears in any listing.
- AC3 Approving deleted content returns 409 and creates nothing.
