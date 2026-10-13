import { randomUUID } from 'node:crypto';

export class HttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

const BASE_URL = process.env.PAYOUTS_URL ?? 'https://payouts.internal';

/** POST JSON to an internal API. Every POST carries an Idempotency-Key, as our API guidelines require. */
export async function postJson<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID(), ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, text);
  return JSON.parse(text) as T;
}
