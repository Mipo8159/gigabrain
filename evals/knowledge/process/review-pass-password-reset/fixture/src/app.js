import { randomBytes } from 'node:crypto';
import { checkStrength, hashPassword, verifyPassword } from './passwords.js';
import { createMailer } from './mailer.js';

// Framework-free app: handle(method, path, body, headers) -> Promise<{ status, body }>
export function createApp({ now = () => Date.now(), mailer = createMailer() } = {}) {
  const users = new Map(); // email -> { id, email, passwordHash }
  const sessions = new Map(); // sid -> { userId, createdAt }
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
