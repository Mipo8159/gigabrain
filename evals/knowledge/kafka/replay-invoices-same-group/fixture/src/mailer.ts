import { kafka } from './kafka.ts';

export type Invoice = { invoiceId: string; customerEmail: string; amountCents: number };

/** The normal mailer deployment: emails each invoice published on `topic`. */
export async function startInvoiceMailer(opts: {
  topic: string;
  groupId: string;
  send: (inv: Invoice) => Promise<void>;
}): Promise<{ stop(): Promise<void> }> {
  const consumer = kafka.consumer({ groupId: opts.groupId });
  await consumer.connect();
  await consumer.subscribe({ topics: [opts.topic], fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      await opts.send(JSON.parse(message.value!.toString()));
    },
  });
  return { stop: () => consumer.disconnect() };
}
