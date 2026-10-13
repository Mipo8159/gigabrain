---
timeout: 600
---
Customers upload attachments through the import wizard; they land as flat files in an uploads directory
(`UPLOADS_DIR`, e.g. `/srv/app/data/uploads`). Now they need to download them again. Add the download route.

In `src/files.ts`:

```ts
export function createFilesHandler(uploadsDir: string): (req: IncomingMessage, res: ServerResponse) => void
```

- `GET /files/<name>` streams the file with that name from `uploadsDir`. The client URL-encodes the name
  (file names can contain spaces, `#`, unicode, ...).
- 404 when there is no such file. Any other path or method: 404.
- Set a sensible `Content-Type` and `Content-Disposition: attachment`.

`src/server.ts` already mounts it. Node 24, no dependencies. Add tests of your own if you like (`node --test`).
