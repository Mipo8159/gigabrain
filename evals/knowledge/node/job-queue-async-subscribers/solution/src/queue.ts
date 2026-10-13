import { EventEmitter } from 'node:events';

export type Job = { id: string; type: string; payload: Record<string, unknown> };

export class JobQueue extends EventEmitter {
  constructor() {
    // routes rejections from async 'job' listeners to the 'error' event
    super({ captureRejections: true });
  }

  enqueue(job: Job): void {
    queueMicrotask(() => {
      try {
        this.emit('job', job);
      } catch (err) {
        this.emit('error', err);
      }
    });
  }
}
