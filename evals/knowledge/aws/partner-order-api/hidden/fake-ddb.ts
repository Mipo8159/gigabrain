// Minimal fake of the DynamoDB JSON wire protocol, enough for these tests.
// Any SDK v3 client (raw or DocumentClient, created anywhere) reaches it through AWS_ENDPOINT_URL_DYNAMODB.
import http from 'node:http';
import type { AddressInfo } from 'node:net';

export type AV = Record<string, any>;
export type Item = Record<string, AV>;
type Reply = { status?: number; body: unknown };
export type Hook = (op: string, req: any) => Reply | undefined | Promise<Reply | undefined>;

export class FakeDynamo {
  tables = new Map<string, Map<string, { item: Item; writtenAt: number }>>();
  calls: { op: string; req: any }[] = [];
  hook?: Hook;
  private srv?: http.Server;

  keySchema: Record<string, string[]>;
  constructor(keySchema: Record<string, string[]>) { this.keySchema = keySchema; }

  keyOf(table: string, item: Item) {
    const names = this.keySchema[table];
    if (!names) throw new Error(`unknown table ${table}`);
    return JSON.stringify(names.map(n => item[n]));
  }
  table(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }
  seed(table: string, item: Item) { this.table(table).set(this.keyOf(table, item), { item, writtenAt: 0 }); }
  get(table: string, key: Item) { return this.table(table).get(this.keyOf(table, key))?.item; }
  all(table: string) { return [...this.table(table).values()].map(v => v.item); }
  reset() { this.tables.clear(); this.calls = []; this.hook = undefined; }

  static error(type: string, message: string, extra: object = {}): Reply {
    return { status: 400, body: { __type: `com.amazonaws.dynamodb.v20120810#${type}`, message, ...extra } };
  }

  async handle(op: string, req: any): Promise<Reply> {
    this.calls.push({ op, req });
    const hooked = await this.hook?.(op, req);
    if (hooked) return hooked;
    switch (op) {
      case 'GetItem': {
        const row = this.table(req.TableName).get(this.keyOf(req.TableName, req.Key));
        return { body: row ? { Item: row.item } : {} };
      }
      case 'PutItem': {
        const k = this.keyOf(req.TableName, req.Item);
        const existing = this.table(req.TableName).get(k);
        if (existing && /attribute_not_exists/.test(req.ConditionExpression ?? '')) {
          return FakeDynamo.error('ConditionalCheckFailedException', 'The conditional request failed',
            req.ReturnValuesOnConditionCheckFailure === 'ALL_OLD' ? { Item: existing.item } : {});
        }
        this.table(req.TableName).set(k, { item: req.Item, writtenAt: Date.now() });
        return { body: {} };
      }
      case 'BatchWriteItem': {
        let n = 0;
        for (const [t, reqs] of Object.entries<any[]>(req.RequestItems)) {
          const seen = new Set<string>();
          for (const r of reqs) {
            n++;
            const k = this.keyOf(t, r.PutRequest?.Item ?? r.DeleteRequest?.Key);
            if (seen.has(k)) return FakeDynamo.error('ValidationException', 'Provided list of item keys contains duplicates');
            seen.add(k);
          }
        }
        if (n > 25) return FakeDynamo.error('ValidationException', 'Too many items requested for the BatchWriteItem call');
        for (const [t, reqs] of Object.entries<any[]>(req.RequestItems)) {
          for (const r of reqs) {
            if (r.PutRequest) this.table(t).set(this.keyOf(t, r.PutRequest.Item), { item: r.PutRequest.Item, writtenAt: Date.now() });
            else this.table(t).delete(this.keyOf(t, r.DeleteRequest.Key));
          }
        }
        return { body: { UnprocessedItems: {} } };
      }
      default:
        return FakeDynamo.error('ValidationException', `fake does not implement ${op}`);
    }
  }

  async start() {
    this.srv = http.createServer(async (req, res) => {
      let raw = '';
      for await (const c of req) raw += c;
      const op = String(req.headers['x-amz-target'] ?? '').split('.').pop()!;
      let reply: Reply;
      try { reply = await this.handle(op, JSON.parse(raw || '{}')); }
      catch (e) { reply = FakeDynamo.error('ValidationException', String(e)); }
      res.writeHead(reply.status ?? 200, { 'content-type': 'application/x-amz-json-1.0' });
      res.end(JSON.stringify(reply.body));
    });
    await new Promise<void>(r => this.srv!.listen(0, '127.0.0.1', r));
    Object.assign(process.env, {
      AWS_ENDPOINT_URL_DYNAMODB: `http://127.0.0.1:${(this.srv.address() as AddressInfo).port}`,
      AWS_ACCESS_KEY_ID: 'AKIDEXAMPLE', AWS_SECRET_ACCESS_KEY: 'secret', AWS_REGION: 'eu-west-1',
      AWS_CONFIG_FILE: '/nonexistent', AWS_SHARED_CREDENTIALS_FILE: '/nonexistent', AWS_EC2_METADATA_DISABLED: 'true',
    });
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_ENDPOINT_URL;
  }

  stop() { this.srv?.closeAllConnections(); this.srv?.close(); }
}
