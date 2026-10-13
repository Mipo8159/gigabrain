import { startInvoiceMailer } from './mailer.ts';

const m = await startInvoiceMailer({
  topic: 'billing.invoices',
  groupId: 'invoice-mailer',
  send: async (inv) => { console.log('mail', inv.invoiceId, inv.customerEmail); },
});
process.once('SIGTERM', () => { void m.stop(); });
