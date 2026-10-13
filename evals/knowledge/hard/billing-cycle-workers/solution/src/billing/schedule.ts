type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const fmts = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    fmts.set(tz, f);
  }
  return f;
}

export function localParts(d: Date, tz: string): Parts {
  const p = Object.fromEntries(fmt(tz).formatToParts(d).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]));
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/** UTC instant of a wall-clock time in `tz` (a time inside a DST gap moves forward by the gap). */
export function zonedTimeToUtc(p: Parts, tz: string): Date {
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let utc = wall;
  for (let i = 0; i < 3; i++) {
    const l = localParts(new Date(utc), tz);
    const asUtc = Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second);
    const offset = asUtc - utc;
    const next = wall - offset;
    if (next === utc) break;
    utc = next;
  }
  return new Date(utc);
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * The renewal after `current`: same day of month and local time as `startedAt` (the anchor, not the
 * previous renewal, so Jan 31 -> Feb 28 -> Mar 31), clamped to the month's last day, in the customer's zone.
 */
export function nextRenewal(startedAt: Date, current: Date, tz: string, interval: 'month' | 'year'): Date {
  const anchor = localParts(startedAt, tz);
  const cur = localParts(current, tz);
  const idx = cur.year * 12 + (cur.month - 1) + (interval === 'year' ? 12 : 1);
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  const day = Math.min(anchor.day, daysInMonth(year, month));
  return zonedTimeToUtc({ year, month, day, hour: anchor.hour, minute: anchor.minute, second: anchor.second }, tz);
}
