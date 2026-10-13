import { deliverWebhook } from './deliver.ts';

export type Job = { id: string; url: string; event: unknown };

// The queue gives each job a 30 s lease; a job that throws is re-queued with its own backoff.
export async function handleJob(job: Job): Promise<void> {
  await deliverWebhook(job.url, job.event);
}
