export async function deliverWebhook(url: string, event: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`webhook ${url} responded ${res.status}`);
}
