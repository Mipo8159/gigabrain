// Dev mailer: keeps messages in memory. Production swaps in the SES adapter with the same interface.
export function createMailer() {
  const outbox = [];
  return {
    outbox,
    async send({ to, subject, text }) {
      outbox.push({ to, subject, text });
    },
  };
}
