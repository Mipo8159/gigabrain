export type Outcome =
  | { status: 'ok'; body: string }
  | { status: 'timeout' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function getText(url: string, opts: { timeoutMs: number; signal?: AbortSignal }): Promise<Outcome> {
  throw new Error('not implemented');
}
