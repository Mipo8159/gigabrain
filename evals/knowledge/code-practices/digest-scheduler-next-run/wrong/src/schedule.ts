const DAY_MS = 24 * 60 * 60 * 1000;

function parseLocalTime(localTime: string): [number, number] {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(localTime);
  if (!m) throw new RangeError(`invalid localTime: ${localTime}`);
  return [Number(m[1]), Number(m[2])];
}

// Minutes east of UTC for `timeZone` at instant `at`, e.g. -240 for New York in summer.
function utcOffsetMinutes(at: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

export function nextRun(after: Date, localTime: string, timeZone: string): Date {
  const [hh, mm] = parseLocalTime(localTime);
  const offsetMs = utcOffsetMinutes(after, timeZone) * 60_000;

  // Shift into the user's wall clock, pick today's slot there, then shift back.
  const local = new Date(after.getTime() + offsetMs);
  let next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hh, mm) - offsetMs;

  while (next <= after.getTime()) next += DAY_MS;
  return new Date(next);
}
