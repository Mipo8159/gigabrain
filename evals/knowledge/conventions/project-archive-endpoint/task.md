---
timeout: 900
---
Product wants projects to be archivable. Please add:

- `POST /projects/:id/archive` and `POST /projects/:id/unarchive`. Both respond with the updated project
  (it has an `archivedAt` field: ISO timestamp, or `null`).
- Archiving a project that is already archived is a conflict (409); unarchiving one that isn't archived too.
- An unknown project id gives 404, same as the other project endpoints.
- An archived project is read-only: renaming it (`PATCH /projects/:id`) must be refused with 409 until it is unarchived.

The app is built by `createApp()` in `src/app.ts`. Add tests next to the existing ones if you like (`npm test`).
