import { DynamicModule, Module } from '@nestjs/common';
import { EVENT_LOG_OPTIONS, EventLog, EventLogOptions } from './event-log';

@Module({})
export class EventLogModule {
  static forRoot(options: EventLogOptions): DynamicModule {
    return {
      module: EventLogModule,
      providers: [{ provide: EVENT_LOG_OPTIONS, useValue: options }, EventLog],
      exports: [EventLog],
    };
  }
}
