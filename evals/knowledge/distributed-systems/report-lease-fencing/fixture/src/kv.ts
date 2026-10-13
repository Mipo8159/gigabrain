// In-memory stand-in for the DynamoDB table (same API as the production adapter in src/dynamo/, not shown).
// Items are plain JSON objects. Writes can carry a condition, evaluated atomically by the store against the
// item currently stored under the key (like a DynamoDB ConditionExpression). A failed condition means the
// write is not applied and put() resolves false.

export type Item = Record<string, string | number | boolean | null>;
export type Condition =
  | { attributeNotExists: string }
  | { attribute: string; op: '=' | '<>' | '<' | '<=' | '>' | '>='; value: string | number }
  | { and: Condition[] }
  | { or: Condition[] };

export type KvOptions = {
  /** Test hook: simulated network latency before an operation reaches the store. */
  latency?: (op: 'get' | 'put', key: string, item?: Item) => Promise<void>;
};

function holds(c: Condition, item: Item | undefined): boolean {
  if ('and' in c) return c.and.every((x) => holds(x, item));
  if ('or' in c) return c.or.some((x) => holds(x, item));
  if ('attributeNotExists' in c) return item?.[c.attributeNotExists] === undefined;
  const v = item?.[c.attribute];
  if (v === undefined || v === null) return false;
  switch (c.op) {
    case '=': return v === c.value;
    case '<>': return v !== c.value;
    case '<': return v < c.value;
    case '<=': return v <= c.value;
    case '>': return v > c.value;
    case '>=': return v >= c.value;
  }
}

export class KvStore {
  #items = new Map<string, Item>();
  #latency: KvOptions['latency'];

  constructor(opts: KvOptions = {}) {
    this.#latency = opts.latency;
  }

  async get(key: string): Promise<Item | undefined> {
    await this.#latency?.('get', key);
    const item = this.#items.get(key);
    return item && structuredClone(item);
  }

  async put(key: string, item: Item, opts: { condition?: Condition } = {}): Promise<boolean> {
    await this.#latency?.('put', key, item);
    if (opts.condition && !holds(opts.condition, this.#items.get(key))) return false;
    this.#items.set(key, structuredClone(item));
    return true;
  }
}
