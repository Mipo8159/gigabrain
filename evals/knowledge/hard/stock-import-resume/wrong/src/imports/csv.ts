/** RFC 4180 record splitter over text: returns complete records and the unfinished tail. */
export function splitRecords(text: string, final: boolean): { records: string[][]; rest: string } {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; continue; }
        if (i + 1 === text.length && !final) break;
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; continue; }
    if (ch === ',') { record.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { record.push(field); records.push(record); record = []; field = ''; start = i + 1; continue; }
    field += ch;
  }
  if (final) {
    if (field !== '' || record.length) { record.push(field); records.push(record); }
    return { records, rest: '' };
  }
  return { records, rest: text.slice(start) };
}
