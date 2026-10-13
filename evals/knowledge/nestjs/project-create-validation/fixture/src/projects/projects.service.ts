import { Injectable } from '@nestjs/common';
import { Project } from './project';

@Injectable()
export class ProjectsService {
  private readonly projects: Project[] = [];
  private nextId = 1;

  findAll(): Project[] {
    return [...this.projects];
  }

  create(input: Omit<Project, 'id'>): Project {
    const project: Project = { id: this.nextId++, ...input };
    this.projects.push(project);
    return project;
  }
}
