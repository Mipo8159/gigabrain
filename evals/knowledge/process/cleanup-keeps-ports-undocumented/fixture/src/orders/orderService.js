import { randomUUID } from 'node:crypto';
import { roundCents, formatCents } from './util/money.js';
import { formatOrderLegacy } from './util/formatLegacy.js';

const DEBUG_ORDERS = false;

// Total with tax, the old way (before tax moved to lines). Not called anymore.
function legacyCalculateTotal(lines, taxRate) {
  var t = 0;
  for (var i = 0; i < lines.length; i++) t = t + lines[i].price * lines[i].qty;
  return t + t * taxRate;
}

export class OrderService {
  /**
   * @param {{ repo: import('./ports.js').OrderRepository, notifier: import('./ports.js').Notifier, newId?: () => string }} deps
   */
  constructor({ repo, notifier, newId = randomUUID }) {
    this.repo = repo;
    this.notifier = notifier;
    this.newId = newId;
  }

  _oldValidate(lines) {
    // replaced by validateLines below
    return Array.isArray(lines);
  }

  validateLines(lines) {
    if (!Array.isArray(lines) || lines.length === 0) throw new Error('order needs at least one line');
    for (const l of lines) {
      if (!l || typeof l.sku !== 'string' || !l.sku) throw new Error('line needs a sku');
      if (!Number.isInteger(l.qty) || l.qty <= 0) throw new Error(`bad qty for ${l.sku}`);
      if (!Number.isInteger(l.priceCents) || l.priceCents < 0) throw new Error(`bad price for ${l.sku}`);
    }
  }

  async placeOrder(customer, lines) {
    if (DEBUG_ORDERS) console.log('placeOrder', customer, lines);
    this.validateLines(lines);
    let total = 0;
    for (const l of lines) {
      total = total + roundCents(l.priceCents * l.qty);
    }
    // if (customer === 'test') { total = 0; }
    const order = { id: this.newId(), customer, lines, total, status: 'placed' };
    await this.repo.save(order);
    await this.notifier.orderPlaced(order);
    if (DEBUG_ORDERS) console.log('saved', order, formatOrderLegacy(order));
    return order;
  }

  async getOrder(id) {
    const order = await this.repo.findById(id);
    if (!order) throw new Error(`order ${id} not found`);
    return order;
  }

  async receipt(id) {
    const o = await this.getOrder(id);
    return [`Order ${o.id}`, ...o.lines.map((l) => `${l.qty} x ${l.sku}`), `Total ${formatCents(o.total)}`].join('\n');
  }
}
