import { config } from '../config.ts';
import { csvLine } from '../lib/csv.ts';
import { formatCents } from '../lib/money.ts';
import { orderStore } from './store.ts';

export function exportOrdersCsv(customerId: string): { csv: string; truncated: boolean } {
  const max = config().exportMaxRows;
  const all = orderStore.byCustomer(customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = all.slice(0, max);
  let csv = csvLine(['id', 'created_at', 'status', 'total']);
  for (const o of rows) csv += csvLine([o.id, o.createdAt, o.status, formatCents(o.totalCents)]);
  return { csv, truncated: all.length > rows.length };
}
