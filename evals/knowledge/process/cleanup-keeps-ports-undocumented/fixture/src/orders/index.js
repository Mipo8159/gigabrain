// Composition root: the only place that chooses adapters.
import { OrderService } from './orderService.js';
import { JsonFileOrderRepository } from './adapters/jsonFileOrderRepository.js';
import { MemoryOrderRepository } from './adapters/memoryOrderRepository.js';
import { ConsoleNotifier } from './adapters/consoleNotifier.js';

export function createOrderModule({ dataFile, notifier = new ConsoleNotifier() } = {}) {
  const repo = dataFile ? new JsonFileOrderRepository(dataFile) : new MemoryOrderRepository();
  return new OrderService({ repo, notifier });
}

export { OrderService };
