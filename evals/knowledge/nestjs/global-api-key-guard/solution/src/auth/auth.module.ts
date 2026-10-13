import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  providers: [
    ApiKeyGuard,
    // useExisting (not useClass) so overrideProvider(ApiKeyGuard) replaces the global instance.
    { provide: APP_GUARD, useExisting: ApiKeyGuard },
  ],
})
export class AuthModule {}
