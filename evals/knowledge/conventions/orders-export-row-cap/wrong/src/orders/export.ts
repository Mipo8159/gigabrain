import { csvLine } from '../lib/csv.ts';
import { formatCents } from '../lib/money.ts';
import { orderStore } from './store.ts';

const DEFAULT_MAX_ROWS = 10_000;

function maxRows(): number {
  const n = Number.parseInt(process.env.EXPORT_MAX_ROWS ?? '', 10);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_ROWS;
}

export function exportOrdersCsv(customerId: string): { csv: string; truncated: boolean } {
  const max = maxRows();
  const all = orderStore.byCustomer(customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = all.slice(0, max);
  let csv = csvLine(['id', 'created_at', 'status', 'total']);
  for (const o of rows) csv += csvLine([o.id, o.createdAt, o.status, formatCents(o.totalCents)]);
  return { csv, truncated: all.length > rows.length };
}
