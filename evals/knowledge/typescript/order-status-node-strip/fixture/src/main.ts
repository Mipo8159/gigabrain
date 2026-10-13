import { systemClock } from './clock.ts';
import { createMemoryOrderRepo } from './orders/repo.ts';

const repo = createMemoryOrderRepo([
  { id: 'o1', customerId: 'c1', status: 'pending', totalCents: 1000, updatedAt: systemClock.now() },
]);
console.log('orders loaded:', (await repo.get('o1'))?.status);
