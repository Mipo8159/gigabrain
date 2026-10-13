import { loadConfig } from './config.js';
import { poolOptions } from './db.js';

const config = loadConfig();
const opts = poolOptions(config);
console.log(`connecting to ${opts.user}@${opts.host}:${opts.port}/${opts.database} (log ${config.logLevel})`);
// const pool = new Pool(opts) ... (not wired in this checkout)
