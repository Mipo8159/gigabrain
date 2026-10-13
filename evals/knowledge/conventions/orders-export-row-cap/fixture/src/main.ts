import { initConfig } from './config.ts';

const cfg = initConfig();
console.log(`shop-backend starting (${cfg.nodeEnv})`);
