import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

/** Shared by main.ts and the e2e tests so both run the same app. */
export function configureApp(app: INestApplication): INestApplication {
  // Express 5 defaults to the "simple" query parser: filter[status]=x stays a flat key. Use qs.
  (app as NestExpressApplication).set('query parser', 'extended');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  return app;
}
