import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { OrderRepository } from '../ports.js';

export class JsonFileOrderRepository extends OrderRepository {
  constructor(file) {
    super();
    this.file = file;
  }
  async #all() {
    if (!existsSync(this.file)) return {};
    return JSON.parse(await readFile(this.file, 'utf8'));
  }
  async save(order) {
    const all = await this.#all();
    all[order.id] = order;
    await writeFile(this.file, JSON.stringify(all, null, 2));
  }
  async findById(id) {
    return (await this.#all())[id] ?? null;
  }
}
