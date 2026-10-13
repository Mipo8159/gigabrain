import { nextRun } from './schedule.ts';

export type User = { id: string; email: string; digestTime: string; timeZone: string; nextDigestAt: Date };

export async function tick(now: Date, due: User[], send: (u: User) => Promise<void>, save: (u: User) => Promise<void>) {
  for (const u of due) {
    if (u.nextDigestAt > now) continue;
    await send(u);
    u.nextDigestAt = nextRun(now, u.digestTime, u.timeZone);
    await save(u);
  }
}
