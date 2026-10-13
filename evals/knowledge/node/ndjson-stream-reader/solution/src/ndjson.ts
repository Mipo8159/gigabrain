import type { Readable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

export async function* readNdjson(input: Readable): AsyncGenerator<unknown> {
  const decoder = new StringDecoder('utf8');
  let buf = '';
  let lineNo = 0;
  const parse = (line: string) => {
    lineNo++;
    if (!line.trim()) return undefined;
    try {
      return { v: JSON.parse(line) };
    } catch (e) {
      throw new Error(`invalid JSON on line ${lineNo}: ${(e as Error).message}`);
    }
  };
  for await (const chunk of input) {
    buf += typeof chunk === 'string' ? chunk : decoder.write(chunk);
    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const r = parse(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
      if (r) yield r.v;
    }
  }
  buf += decoder.end();
  const r = parse(buf);
  if (r) yield r.v;
}
