import { EventEmitter } from 'node:events';

export type Job = { id: string; type: string; payload: Record<string, unknown> };

export class JobQueue extends EventEmitter {
  enqueue(job: Job): void {
    setImmediate(() => {
      try {
        this.emit('job', job);
      } catch (err) {
        this.emit('error', err);
      }
    });
  }
}
