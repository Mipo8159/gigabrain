import type { Readable } from 'node:stream';

/**
 * Streaming RFC 4180 parser: yields one record (array of fields) at a time and pulls the next chunk
 * only when the consumer asks for more, so memory stays flat and a slow consumer slows the read.
 * Decodes UTF-8 across chunk boundaries, strips a leading BOM, accepts CRLF and LF.
 */
export async function* parseCsv(stream: Readable): AsyncGenerator<string[]> {
  const decoder = new TextDecoder('utf-8');
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let quotePending = false; // saw a quote inside a quoted field: either "" or the closing quote
  let started = false;
  let any = false;

  function* feed(text: string): Generator<string[]> {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (!started) {
        started = true;
        if (ch === '﻿') continue;
      }
      any = true;
      if (inQuotes) {
        if (quotePending) {
          quotePending = false;
          if (ch === '"') { field += '"'; continue; }
          inQuotes = false; // closing quote; fall through to handle ch as unquoted
        } else if (ch === '"') {
          quotePending = true;
          continue;
        } else {
          field += ch;
          continue;
        }
      }
      if (ch === '"' && field === '') { inQuotes = true; continue; }
      if (ch === ',') { record.push(field); field = ''; continue; }
      if (ch === '\r') continue;
      if (ch === '\n') {
        record.push(field); field = '';
        const r = record; record = []; any = false;
        yield r;
        continue;
      }
      field += ch;
    }
  }

  for await (const chunk of stream) {
    const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    yield* feed(text);
  }
  yield* feed(decoder.decode());
  if (quotePending) { quotePending = false; inQuotes = false; }
  if (any || record.length) {
    record.push(field);
    yield record;
  }
}
