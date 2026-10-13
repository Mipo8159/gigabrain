export async function recordPaymentEvent(event: { id: string; type: string; data: unknown }): Promise<void> {
  console.log('payment event', event.id, event.type);
}
