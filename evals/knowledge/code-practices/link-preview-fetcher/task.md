---
timeout: 600
---
When someone pastes a link in a chat message we want to show a preview card with the page title. The chat
backend (Node 24, runs on our AWS VPC next to the other services) fetches the page server-side. Implement it in
`src/preview.ts`:

```ts
export type PreviewDeps = {
  lookup(hostname: string): Promise<{ address: string; family: 4 | 6 }[]>;  // dns.promises.lookup(h, { all: true })
  fetch: typeof globalThis.fetch;
};
export async function fetchPreview(url: string, deps: PreviewDeps): Promise<{ url: string; title: string | null }>
```

- `url` is whatever the user pasted. Returns the final URL and the text of the page's `<title>` (`null` if none).
- Lots of pasted links are shorteners or http->https hops, so follow redirects (up to 5).
- Throw (any `Error`) for links we can't or won't preview; the caller then just shows the bare link.
- Use `deps.fetch` / `deps.lookup` for all network access (production passes the real ones; tests pass fakes).
- Don't read more than ~1 MB of a body.

No new dependencies. Add tests of your own if you like (`node --test`).
