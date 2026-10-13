---
timeout: 900
deps: typescript
---
Orders currently store `status` as a free string and any code can set any value. Add a proper status model and a service that owns status changes.

1. `src/orders/status.ts`: the order statuses `pending`, `paid`, `shipped`, `delivered`, `cancelled`, and the allowed transitions:
   pending → paid | cancelled, paid → shipped | cancelled, shipped → delivered. Nothing leaves `delivered` or `cancelled`.
   Export `canTransition(from, to): boolean` and a `Transition` type (`{ from; to }`).
2. `src/orders/order-service.ts`: `class OrderService`, constructed with an `OrderRepo` (`src/orders/repo.ts`) and a `Clock` (`src/clock.ts`). Method `transition(orderId: string, to): Promise<Order>`: loads the order, checks the move, saves it with the new status and `updatedAt` from the clock, returns the saved order. An illegal move throws `InvalidTransitionError` (export it; it should carry `from` and `to`). A missing order throws `OrderNotFoundError`.
3. `src/orders/index.ts`: the public entry point other teams import from. Re-export the service, both errors, `canTransition`, the status type and `Transition` from here.

Statuses are stored and sent over the API as the lowercase strings above. We run the TypeScript sources directly with `node` (Node 24, no build step), same for tests (`npm test`).
