import { config } from '../config.ts';

export interface Mail { to: string; subject: string; text: string }
export interface Transport { send(m: Mail & { from: string; host: string; port: number }): Promise<void> }

let transport: Transport = { async send() { /* real SMTP client wired in main.ts */ } };
export const setTransport = (t: Transport) => { transport = t; };

export async function sendMail(m: Mail): Promise<void> {
  const { smtpHost, smtpPort, mailFrom } = config();
  await transport.send({ ...m, from: mailFrom, host: smtpHost, port: smtpPort });
}
