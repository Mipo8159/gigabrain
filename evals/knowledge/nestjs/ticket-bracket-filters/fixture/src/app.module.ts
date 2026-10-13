import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [HealthController],
})
export class AppModule {}
