import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function checkStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'password must be at least 10 characters';
  return null;
}

export function hashPassword(pw) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(pw, salt, 32).toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const got = scryptSync(pw, Buffer.from(salt, 'hex'), 32);
  return timingSafeEqual(got, Buffer.from(hash, 'hex'));
}
