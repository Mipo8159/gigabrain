import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PROJECTS = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `Project ${i + 1}` }));

@Controller('projects')
export class ProjectsController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  findAll(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    const size = Number(this.config.get('PROJECTS_PAGE_SIZE'));
    return PROJECTS.slice((page - 1) * size, page * size);
  }
}
