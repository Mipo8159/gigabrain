# Content platform: moderation v1 (requirements)

Creators submit content from the mobile app. Admins moderate it in the admin panel.

## Submission
- R1 `POST /content` stores new content as `PENDING`, owned by the authenticated creator.
- R2 `PATCH /content/:id` lets the owner change `title` and `category` **only while the content is `PENDING`**. Any other status returns 409 and changes nothing. Content owned by someone else returns 404.

## Moderation
- R3 `POST /admin/content/:id/approve` approves `PENDING` content; anything else returns 409. Approving `REEL` content creates a reel; `LESSON` content creates a lesson in its course.
- R4 `POST /admin/content/:id/reject` with body `{ reason }`: the trimmed reason is required (otherwise 400). Only `PENDING` content can be rejected (otherwise 409). On success the status is `REJECTED` and the reason is stored.
- R5 A reel or lesson created by approval belongs to the same region as the content it came from.

## Listing
- R6 `GET /content` returns only content in the requesting user's region.
