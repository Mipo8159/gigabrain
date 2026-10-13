export type Outcome =
  | { status: 'ok'; body: string }
  | { status: 'timeout' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function getText(url: string, opts: { timeoutMs: number; signal?: AbortSignal }): Promise<Outcome> {
  const signals = [AbortSignal.timeout(opts.timeoutMs)];
  if (opts.signal) signals.push(opts.signal);
  try {
    const res = await fetch(url, { signal: AbortSignal.any(signals) });
    const body = await res.text();
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    return { status: 'ok', body };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return opts.signal?.aborted ? { status: 'cancelled' } : { status: 'timeout' };
    }
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
