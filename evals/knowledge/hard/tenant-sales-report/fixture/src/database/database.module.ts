import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { APP_CONFIG, AppConfig, loadConfig } from '../config';
import { PG_POOL } from './tokens';
import { DbService } from './db.service';

@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadConfig() },
    {
      provide: PG_POOL,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => {
        const pool = new Pool({ connectionString: cfg.databaseUrl, max: 10 });
        pool.on('error', (e) => console.error('idle pg client error', e));
        return pool;
      },
    },
    DbService,
  ],
  exports: [APP_CONFIG, DbService],
})
export class DatabaseModule {}
