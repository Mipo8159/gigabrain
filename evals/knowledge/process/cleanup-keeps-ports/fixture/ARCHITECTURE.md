# Orders module

Ports and adapters. `OrderService` holds the business rules and only talks to the ports in
`src/orders/ports.js`. Adapters implement them: the JSON-file repository is what runs in the kiosk build,
the in-memory one backs tests and the demo, and `ConsoleNotifier` will be replaced by the SMS gateway
adapter next quarter. `src/orders/index.js` is the only place that picks adapters.
