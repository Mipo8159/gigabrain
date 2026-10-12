# CP-141 Approving lesson submissions

- AC1 Approving `LESSON` content that has a `courseId` creates a lesson in that course.
- AC2 Approving `LESSON` content **without** a `courseId` fails with 400; the content stays `PENDING` and nothing is created. A lesson must never become a reel: reels are a public feed, lessons can be paid.
- AC3 Approving `REEL` content creates a reel (unchanged).
