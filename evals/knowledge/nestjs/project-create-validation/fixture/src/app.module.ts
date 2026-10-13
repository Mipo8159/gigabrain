import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [HealthController],
})
export class AppModule {}
