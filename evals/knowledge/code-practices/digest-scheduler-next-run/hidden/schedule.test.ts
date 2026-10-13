import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRun } from '../src/schedule.ts';

const iso = (d: Date) => d.toISOString().replace('.000Z', 'Z');
function local(d: Date, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

test('same day when the time is still ahead', () => {
  assert.equal(iso(nextRun(new Date('2026-06-01T12:00:00Z'), '09:00', 'America/New_York')), '2026-06-01T13:00:00Z');
  assert.equal(iso(nextRun(new Date('2026-01-01T00:00:00Z'), '09:00', 'Asia/Kolkata')), '2026-01-01T03:30:00Z');
});

test('strictly after: a run at exactly the due instant schedules tomorrow', () => {
  assert.equal(iso(nextRun(new Date('2026-06-01T13:00:00Z'), '09:00', 'America/New_York')), '2026-06-02T13:00:00Z');
});

test('spring forward: still 09:00 local the next day', () => {
  assert.equal(iso(nextRun(new Date('2026-03-07T14:00:00Z'), '09:00', 'America/New_York')), '2026-03-08T13:00:00Z');
  assert.equal(iso(nextRun(new Date('2026-03-28T09:00:00Z'), '09:00', 'Europe/London')), '2026-03-29T08:00:00Z');
});

test('fall back: still 09:00 local the next day', () => {
  assert.equal(iso(nextRun(new Date('2026-10-31T13:00:00Z'), '09:00', 'America/New_York')), '2026-11-01T14:00:00Z');
  // Sydney leaves daylight time on 2026-04-05
  assert.equal(iso(nextRun(new Date('2026-04-03T20:00:00Z'), '07:00', 'Australia/Sydney')), '2026-04-04T21:00:00Z');
});

test('a chain of runs across both DST changes stays at the picked local time, one per day', () => {
  for (const [tz, start, days] of [['America/New_York', '2026-03-05T00:00:00Z', 6], ['America/New_York', '2026-10-29T00:00:00Z', 6], ['Europe/Berlin', '2026-10-23T00:00:00Z', 5]] as const) {
    let t = new Date(start);
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const n = nextRun(t, '18:45', tz);
      assert.ok(n > t);
      const l = local(n, tz);
      assert.equal(l.time, '18:45', `${tz} run ${iso(n)} is ${l.time} local`);
      dates.push(l.date);
      t = n;
    }
    assert.equal(new Set(dates).size, days, `${tz}: ${dates}`);
    for (let i = 1; i < dates.length; i++) assert.equal(Date.parse(dates[i]) - Date.parse(dates[i - 1]), 86_400_000, `${tz}: skipped a day: ${dates}`);
  }
});

test('a picked time that does not exist that day still sends that day', () => {
  // 02:30 does not exist in New York on 2026-03-08 (02:00 -> 03:00)
  const n = nextRun(new Date('2026-03-07T08:00:00Z'), '02:30', 'America/New_York');
  assert.ok(!Number.isNaN(n.getTime()), 'got Invalid Date');
  assert.equal(local(n, 'America/New_York').date, '2026-03-08');
  assert.ok(n.getTime() >= Date.parse('2026-03-08T07:00:00Z') && n.getTime() <= Date.parse('2026-03-08T07:30:00Z'), `got ${iso(n)}`);
  const n2 = nextRun(n, '02:30', 'America/New_York');
  assert.equal(iso(n2), '2026-03-09T06:30:00Z');
});

test('a picked time that happens twice that day sends once', () => {
  // 01:30 happens twice in New York on 2026-11-01 (05:30Z EDT and 06:30Z EST)
  let t = new Date('2026-10-31T12:00:00Z');
  const runs: Date[] = [];
  for (let i = 0; i < 3; i++) { t = nextRun(t, '01:30', 'America/New_York'); runs.push(t); }
  assert.ok(['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z'].includes(iso(runs[0])), `got ${iso(runs[0])}`);
  assert.equal(iso(runs[1]), '2026-11-02T06:30:00Z', `sent twice on Nov 1: ${runs.map(iso)}`);
  assert.equal(iso(runs[2]), '2026-11-03T06:30:00Z');
});
