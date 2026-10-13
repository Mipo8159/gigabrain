import { Module } from '@nestjs/common';
import { EventLogRoot } from '../events/event-log.root';
import { AuditController } from './audit.controller';

@Module({
  imports: [EventLogRoot],
  controllers: [AuditController],
})
export class AuditModule {}
