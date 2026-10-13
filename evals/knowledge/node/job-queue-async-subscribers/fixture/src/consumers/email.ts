import type { JobQueue, Job } from '../queue.ts';

async function sendEmail(to: string, template: string): Promise<void> {
  if (!to.includes('@')) throw new Error(`invalid recipient: ${to}`);
  await new Promise((r) => setTimeout(r, 5));
}

export function registerEmailConsumer(queue: JobQueue): void {
  queue.on('job', async (job: Job) => {
    if (job.type !== 'email') return;
    await sendEmail(String(job.payload.to), String(job.payload.template));
  });
}
