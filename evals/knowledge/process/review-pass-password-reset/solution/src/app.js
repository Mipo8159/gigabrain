import { randomBytes, createHash } from 'node:crypto';
import { checkStrength, hashPassword, verifyPassword } from './passwords.js';
import { createMailer } from './mailer.js';

const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_URL = 'https://app.example.com/reset?token=';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// Framework-free app: handle(method, path, body, headers) -> Promise<{ status, body }>
export function createApp({ now = () => Date.now(), mailer = createMailer() } = {}) {
  const users = new Map(); // email -> { id, email, passwordHash }
  const sessions = new Map(); // sid -> { userId, createdAt }
  const resets = new Map(); // sha256(token) -> { userId, expiresAt }; the raw token only goes out by email
  let nextId = 1;

  const normEmail = (e) => String(e ?? '').trim().toLowerCase();
  const userById = (id) => [...users.values()].find((u) => u.id === id);

  const routes = {
    'POST /signup': async ({ email, password }) => {
      email = normEmail(email);
      if (!/^[^@\s]+@[^@\s]+$/.test(email)) return [400, { error: 'invalid email' }];
      const weak = checkStrength(password);
      if (weak) return [400, { error: weak }];
      if (users.has(email)) return [409, { error: 'email taken' }];
      users.set(email, { id: nextId++, email, passwordHash: hashPassword(password) });
      return [201, { ok: true }];
    },
    'POST /login': async ({ email, password }) => {
      const u = users.get(normEmail(email));
      if (!u || typeof password !== 'string' || !verifyPassword(password, u.passwordHash)) return [401, { error: 'bad credentials' }];
      const sid = randomBytes(24).toString('base64url');
      sessions.set(sid, { userId: u.id, createdAt: now() });
      return [200, { sid }];
    },
    'GET /me': async (_body, headers) => {
      const s = sessions.get(headers?.sid);
      if (!s) return [401, { error: 'not logged in' }];
      return [200, { id: s.userId, email: userById(s.userId).email }];
    },
    'POST /password-reset/request': async ({ email }) => {
      const u = users.get(normEmail(email));
      if (u) {
        const token = randomBytes(32).toString('base64url');
        resets.set(sha256(token), { userId: u.id, expiresAt: now() + RESET_TTL_MS });
        await mailer.send({
          to: u.email,
          subject: 'Reset your password',
          text: `Reset your password: ${RESET_URL}${token}\nThe link expires in 30 minutes.`,
        });
      }
      return [202, { ok: true }]; // same answer either way: no account enumeration
    },
    'POST /password-reset/confirm': async ({ token, newPassword }) => {
      if (typeof token !== 'string' || !token) return [400, { error: 'invalid or expired token' }];
      const key = sha256(token);
      const r = resets.get(key);
      if (!r || now() > r.expiresAt) {
        resets.delete(key);
        return [400, { error: 'invalid or expired token' }];
      }
      const weak = checkStrength(newPassword);
      if (weak) return [400, { error: weak }]; // token stays valid: the user can retry with a stronger one
      resets.delete(key);
      const u = userById(r.userId);
      u.passwordHash = hashPassword(newPassword);
      for (const [sid, s] of sessions) if (s.userId === u.id) sessions.delete(sid);
      for (const [k, other] of resets) if (other.userId === u.id) resets.delete(k);
      return [200, { ok: true }];
    },
  };

  return {
    mailer,
    async handle(method, path, body = {}, headers = {}) {
      const route = routes[`${method} ${path}`];
      if (!route) return { status: 404, body: { error: 'not found' } };
      const [status, out] = await route(body ?? {}, headers);
      return { status, body: out };
    },
  };
}
