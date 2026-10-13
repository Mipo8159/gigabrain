export type Outcome =
  | { status: 'ok'; body: string }
  | { status: 'timeout' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function getText(url: string, opts: { timeoutMs: number; signal?: AbortSignal }): Promise<Outcome> {
  const timeout = AbortSignal.timeout(opts.timeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  try {
    const res = await fetch(url, { signal });
    const body = await res.text();
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    return { status: 'ok', body };
  } catch (err) {
    if (opts.signal?.aborted) return { status: 'cancelled' };
    if (timeout.aborted) return { status: 'timeout' };
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
