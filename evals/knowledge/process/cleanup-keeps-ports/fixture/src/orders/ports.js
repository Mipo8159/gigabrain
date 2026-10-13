// Ports: what OrderService needs from the outside world.

export class OrderRepository {
  /** @param {object} order */
  async save(order) { throw new Error('not implemented'); }
  /** @param {string} id @returns {Promise<object|null>} */
  async findById(id) { throw new Error('not implemented'); }
}

export class Notifier {
  /** @param {object} order */
  async orderPlaced(order) { throw new Error('not implemented'); }
}
