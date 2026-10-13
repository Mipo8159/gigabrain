import { Notifier } from '../ports.js';

export class ConsoleNotifier extends Notifier {
  async orderPlaced(order) {
    console.log(`[orders] order ${order.id} placed: ${order.total} for ${order.customer}`);
  }
}
