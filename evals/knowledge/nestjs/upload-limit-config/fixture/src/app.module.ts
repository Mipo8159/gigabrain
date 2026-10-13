import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import defaults from './config/defaults';
import { AttachmentsModule } from './attachments/attachments.module';
import { HealthController } from './health/health.controller';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [defaults] }), ProjectsModule, AttachmentsModule],
  controllers: [HealthController],
  providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) }],
})
export class AppModule {}
