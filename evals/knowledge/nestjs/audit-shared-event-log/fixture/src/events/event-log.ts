import { Inject, Injectable } from '@nestjs/common';

export const EVENT_LOG_OPTIONS = Symbol('EVENT_LOG_OPTIONS');

export interface EventLogOptions {
  /** Oldest events are dropped once the log holds this many. */
  capacity: number;
}

export interface LoggedEvent {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  at: string;
}

/** Bounded in-memory event log. Will be replaced by a real stream later. */
@Injectable()
export class EventLog {
  private readonly events: LoggedEvent[] = [];
  private seq = 0;

  constructor(@Inject(EVENT_LOG_OPTIONS) private readonly options: EventLogOptions) {}

  append(type: string, payload: Record<string, unknown>): LoggedEvent {
    const event = { seq: ++this.seq, type, payload, at: new Date().toISOString() };
    this.events.push(event);
    if (this.events.length > this.options.capacity) this.events.shift();
    return event;
  }

  /** Events in insertion order (oldest first). */
  all(): LoggedEvent[] {
    return [...this.events];
  }
}
