import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Region, credentials and endpoint come from the environment.
export const eventBridge = new EventBridgeClient({});

export const busName = () => {
  const b = process.env.ORDER_EVENTS_BUS;
  if (!b) throw new Error('ORDER_EVENTS_BUS is not set');
  return b;
};
