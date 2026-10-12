# CP-130 Creators can edit a submission

- AC1 `PATCH /content/:id` updates `title`, `category` and `coverUrl` only; any other field in the body is ignored.
- AC2 Editing is allowed only while the content is `PENDING`. Editing `APPROVED` or `REJECTED` content returns 409 and changes nothing (approved content is already live as a reel or lesson).
- AC3 Every successful edit stores `updatedBy` = the editing user's id.
