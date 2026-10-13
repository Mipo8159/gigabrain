import { EventLogModule } from './event-log.module';

/**
 * The one EventLog for this process. Nest 11 identifies dynamic modules by object reference,
 * so every importer must use this constant: a second forRoot() call would build a second log.
 */
export const EventLogRoot = EventLogModule.forRoot({ capacity: 1000 });
