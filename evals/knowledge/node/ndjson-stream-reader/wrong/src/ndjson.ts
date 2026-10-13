import type { Readable } from 'node:stream';

export async function* readNdjson(input: Readable): AsyncGenerator<unknown> {
  let buffer = '';
  let lineNo = 0;

  const parseLine = (line: string): { value: unknown } | undefined => {
    lineNo++;
    if (line.trim() === '') return undefined;
    try {
      return { value: JSON.parse(line) };
    } catch (err) {
      throw new Error(`invalid JSON on line ${lineNo}: ${(err as Error).message}`);
    }
  };

  for await (const chunk of input) {
    buffer += chunk.toString('utf8');
    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const parsed = parseLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      if (parsed) yield parsed.value;
    }
  }

  const parsed = parseLine(buffer);
  if (parsed) yield parsed.value;
}
