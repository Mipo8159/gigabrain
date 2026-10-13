export async function fetchJson<T = unknown>(url: string, opts: { timeoutMs: number }): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  return (await res.json()) as T;
}
