import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.ts';

/** Stateless signed session cookie: `<userId>.<expiresAtMs>.<sig>`. */
export function issueSession(userId: string, nowMs = Date.now()): string {
  const exp = nowMs + config().sessionTtlMinutes * 60_000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySession(cookie: string, nowMs = Date.now()): string | null {
  const [userId, exp, sig] = cookie.split('.');
  if (!userId || !exp || !sig) return null;
  const want = Buffer.from(sign(`${userId}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return Number(exp) > nowMs ? userId : null;
}

const sign = (s: string) => createHmac('sha256', config().sessionSecret).update(s).digest('base64url');
