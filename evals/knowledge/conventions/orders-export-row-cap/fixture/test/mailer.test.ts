import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testConfig } from './helpers.ts';
import { sendMail, setTransport } from '../src/mail/mailer.ts';

test('mail goes through the configured SMTP host', async () => {
  testConfig({ SMTP_HOST: 'mx.internal', SMTP_PORT: '2525' });
  const sent: any[] = [];
  setTransport({ async send(m) { sent.push(m); } });
  await sendMail({ to: 'a@b.c', subject: 'hi', text: 'hello' });
  assert.equal(sent[0].host, 'mx.internal');
  assert.equal(sent[0].port, 2525);
});
