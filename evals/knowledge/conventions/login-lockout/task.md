---
timeout: 900
heldout: true
---
We're seeing credential-stuffing against `/login`. Please add an account lockout in `src/auth/login.ts`:

- After 5 consecutive failed password attempts for an account, lock it. A locked account can't log in,
  even with the right password: `login()` returns `{ ok: false, reason: 'locked' }`.
- A successful login resets the failure count.
- `unlockAccount(userId: string): void` (new export in `src/auth/login.ts`) lets support unlock it; it resets the count.
- When an account gets locked, emit a `warn` log event `auth.account_locked` with the user, so on-call can
  see who got locked out and support can find the account.

`login(email, password)` keeps its current signature and return type (see `src/auth/types.ts`).
Add tests next to the existing ones if you like (`npm test`).
