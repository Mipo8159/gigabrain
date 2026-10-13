import { Controller, Get, Param, NotFoundException } from '@nestjs/common';

const PROJECTS = [
  { id: 1, key: 'WEB', name: 'Website' },
  { id: 2, key: 'OPS', name: 'Operations' },
];

@Controller('projects')
export class ProjectsController {
  @Get()
  findAll() {
    return PROJECTS;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const project = PROJECTS.find((p) => p.id === Number(id));
    if (!project) throw new NotFoundException();
    return project;
  }
}
