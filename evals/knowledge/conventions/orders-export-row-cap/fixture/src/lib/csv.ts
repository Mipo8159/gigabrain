const cell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export const csvLine = (values: unknown[]): string => values.map(cell).join(',') + '\n';
