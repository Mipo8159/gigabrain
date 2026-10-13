import { loadConfig } from './config.ts';

const config = loadConfig(process.env);
console.log(`listening on :${config.port} (log level ${config.logLevel})`);
