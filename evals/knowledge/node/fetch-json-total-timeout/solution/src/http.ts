export async function fetchJson<T = unknown>(url: string, opts: { timeoutMs: number }): Promise<T> {
  // The signal stays armed until the body has been read, not just until headers arrive.
  const signal = AbortSignal.timeout(opts.timeoutMs);
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal });
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
