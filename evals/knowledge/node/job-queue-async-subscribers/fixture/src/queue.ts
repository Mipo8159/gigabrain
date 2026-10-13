import { EventEmitter } from 'node:events';

export type Job = { id: string; type: string; payload: Record<string, unknown> };

export class JobQueue extends EventEmitter {
  enqueue(job: Job): void {
    throw new Error('not implemented');
  }
}
