---
timeout: 600
deps: aws
---
Avatars and receipts are moving off our API servers: the browser will upload straight to S3.
Please add `createUploadUrl` to `src/uploads.ts`, next to the existing download helper.

```ts
export async function createUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string; // what the browser will send as Content-Type
}): Promise<{ url: string; key: string }>
```

- Only `image/png`, `image/jpeg` and `application/pdf` are accepted; anything else throws.
- Key: `uploads/<userId>/<random id>-<fileName>`, in the bucket from `UPLOADS_BUCKET`.
- The frontend does exactly `fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } })`,
  no other headers.
- The URL is valid for 10 minutes.
- An upload with a different Content-Type than the one we issued the URL for must be rejected by S3
  (security asked for this after the HTML-in-a-PNG incident).

The AWS SDK v3 packages are already installed; don't add dependencies. There is no AWS account in
this sandbox. Add a test of your own if you like (`node --test`).
