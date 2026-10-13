import { pool } from './db.ts';
import { LeaderElector } from './leader.ts';

const SCHEDULER_LOCK = 724_001;

export function startScheduler(jobs: { name: string; run: () => Promise<void> }[]) {
  const elector = new LeaderElector(pool, SCHEDULER_LOCK);
  let running = false;
  elector.on('leadershipLost', () => { running = false; console.warn('scheduler: leadership lost, pausing jobs'); });

  const tick = async () => {
    if (!(await elector.campaign())) return;
    if (running) return;
    running = true;
    for (const job of jobs) {
      if (!elector.isLeader()) break;
      await job.run().catch((err) => console.error(`job ${job.name} failed`, err));
    }
    running = false;
  };
  const timer = setInterval(() => { tick().catch((err) => console.error('scheduler tick failed', err)); }, 5_000);
  return async () => { clearInterval(timer); await elector.resign(); };
}
