import { clock, HOUR } from '../lib/clock.ts';
import { newId, newToken } from '../lib/ids.ts';
import { Table } from '../lib/store.ts';
import { NotFoundError, TokenExpiredError } from '../errors.ts';

export interface ResetToken { id: string; token: string; userId: string; expiresAt: string; usedAt: string | null }

const RESET_TTL = 1 * HOUR;
export const resetTokens = new Table<ResetToken>();

export function issueResetToken(userId: string): ResetToken {
  return resetTokens.insert({
    id: newId('rst'),
    token: newToken(),
    userId,
    expiresAt: new Date(clock.now().getTime() + RESET_TTL).toISOString(),
    usedAt: null,
  });
}

export function consumeResetToken(token: string): string {
  const [t] = resetTokens.find((x) => x.token === token && x.usedAt === null);
  if (!t) throw new NotFoundError('reset token');
  const now = clock.now();
  if (new Date(t.expiresAt) <= now) throw new TokenExpiredError();
  resetTokens.update(t.id, { usedAt: now.toISOString() });
  return t.userId;
}
