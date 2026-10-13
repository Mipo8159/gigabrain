export async function fetchJson<T = unknown>(url: string, opts: { timeoutMs: number }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  return (await res.json()) as T;
}
