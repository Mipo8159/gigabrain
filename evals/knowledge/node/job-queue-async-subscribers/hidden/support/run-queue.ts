// Runs in a child process so a crash shows up as a non-zero exit code.
import { JobQueue } from '../../src/queue.ts';

const queue = new JobQueue();
const errors: string[] = [];
const done: string[] = [];
queue.on('error', (err: Error) => errors.push(err.message));

queue.on('job', async (job) => {
  await new Promise((r) => setTimeout(r, 5));
  if (job.payload.fail) throw new Error(`job ${job.id} failed`);
  done.push(`a:${job.id}`);
});
queue.on('job', async (job) => {
  await new Promise((r) => setTimeout(r, 1));
  done.push(`b:${job.id}`);
});

queue.enqueue({ id: '1', type: 't', payload: {} });
queue.enqueue({ id: '2', type: 't', payload: { fail: true } });
queue.enqueue({ id: '3', type: 't', payload: {} });

setTimeout(() => {
  queue.enqueue({ id: '4', type: 't', payload: {} });
  setTimeout(() => {
    console.log(JSON.stringify({ errors, done: done.sort() }));
  }, 100);
}, 50);
