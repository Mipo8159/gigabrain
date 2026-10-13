// rows: array of objects; columns: [{ key, header }]
export function toCsv(rows, columns) {
  const head = columns.map((c) => c.header).join(',');
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(','));
  return [head, ...body].join('\r\n') + '\r\n';
}

function cell(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}
