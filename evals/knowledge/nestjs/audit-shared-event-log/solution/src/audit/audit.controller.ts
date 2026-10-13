import { Controller, Get, Query } from '@nestjs/common';
import { EventLog } from '../events/event-log';

@Controller('audit')
export class AuditController {
  constructor(private readonly log: EventLog) {}

  @Get('events')
  events(@Query('type') type?: string) {
    return this.log
      .all()
      .filter((e) => !type || e.type === type)
      .reverse();
  }
}
