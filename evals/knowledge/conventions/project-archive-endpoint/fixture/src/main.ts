import { createApp } from './app.ts';
import { log } from './lib/log.ts';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => log.info('listening', { port }));
