import type { Writable } from 'node:stream';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';

const cell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };

export async function writeCsv(rows: AsyncIterable<Record<string, unknown>>, out: Writable): Promise<void> {
  let keys: string[] | undefined;
  for await (const row of rows) {
    let line = '';
    if (!keys) { keys = Object.keys(row); line += keys.map(cell).join(',') + '\r\n'; }
    line += keys.map(k => cell(row[k])).join(',') + '\r\n';
    if (!out.write(line)) await once(out, 'drain');
  }
  out.end();
  await finished(out);
}
