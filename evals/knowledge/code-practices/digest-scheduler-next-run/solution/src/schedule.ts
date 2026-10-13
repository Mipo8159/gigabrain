const fmts = new Map<string, Intl.DateTimeFormat>();
function fmt(timeZone: string) {
  let f = fmts.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    fmts.set(timeZone, f);
  }
  return f;
}

// Wall-clock fields of instant t in timeZone, packed as a UTC epoch.
function wallAsUtc(t: number, timeZone: string): number {
  const p = Object.fromEntries(fmt(timeZone).formatToParts(new Date(t)).map(x => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}
const offsetAt = (t: number, tz: string) => wallAsUtc(Math.floor(t / 1000) * 1000, tz) - Math.floor(t / 1000) * 1000;

// Local wall time -> instant. Skipped times shift forward by the gap; repeated times use the earlier instant.
function zonedToInstant(wall: number, tz: string): number {
  const before = offsetAt(wall - 86_400_000, tz);
  const after = offsetAt(wall + 86_400_000, tz);
  const valid = [...new Set([before, after])].map(o => wall - o).filter(t => offsetAt(t, tz) === wall - t);
  if (valid.length) return Math.min(...valid);
  return wall - before;
}

export function nextRun(after: Date, localTime: string, timeZone: string): Date {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(localTime);
  if (!m) throw new RangeError(`bad localTime: ${localTime}`);
  const [hh, mm] = [Number(m[1]), Number(m[2])];
  const today = new Date(wallAsUtc(after.getTime(), timeZone));
  for (let d = 0; d < 3; d++) {
    const wall = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + d, hh, mm);
    const t = zonedToInstant(wall, timeZone);
    if (t > after.getTime()) return new Date(t);
  }
  throw new Error('unreachable');
}
