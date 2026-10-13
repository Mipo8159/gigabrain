export interface Clock {
  now(): Date;
}

const systemClock: Clock = { now: () => new Date() };
let current: Clock = systemClock;

/** The app's source of time. */
export const clock: Clock = {
  now: () => current.now(),
};

/** Swap the clock (tests). Returns a function that restores the previous one. */
export function useClock(c: Clock): () => void {
  const prev = current;
  current = c;
  return () => { current = prev; };
}

export class FakeClock implements Clock {
  private t: number;
  constructor(start: Date | string = '2030-01-01T00:00:00Z') {
    this.t = new Date(start).getTime();
  }
  now(): Date {
    return new Date(this.t);
  }
  advance(ms: number): void {
    this.t += ms;
  }
  set(d: Date | string): void {
    this.t = new Date(d).getTime();
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
