export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid_credentials' | 'locked' };
