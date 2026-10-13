---
timeout: 600
check: TZ=Asia/Kolkata node --test --test-reporter=dot 'hidden/**/*.test.*'
---
Users can now pick when their daily digest email arrives: a local time like `"09:00"` plus their IANA time zone
(`"America/New_York"`, `"Europe/London"`, ...), both stored on the user. The scheduler worker calls `nextRun` after
each send to decide when the next one is due, and stores the returned instant.

Implement it in `src/schedule.ts`:

```ts
export function nextRun(after: Date, localTime: string, timeZone: string): Date
```

- Returns the first instant strictly after `after` at which the digest is due: the user's wall clock in
  `timeZone` shows `localTime` (`"HH:MM"`, 24-hour).
- Users expect it every day, exactly once a day, at the time they picked.
- The worker fleet runs in whatever region has capacity, so don't assume the server's own time zone.

Node 24, no dependencies please (we don't want a date library just for this). Add tests of your own if you like.
