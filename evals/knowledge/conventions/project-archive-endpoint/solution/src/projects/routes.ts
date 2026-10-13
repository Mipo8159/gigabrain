import type { Router } from '../http/router.ts';
import { reply } from '../http/router.ts';
import { ForbiddenError } from '../http/errors.ts';
import { archiveProject, createProject, deleteProject, getProject, listProjects, renameProject, unarchiveProject } from './service.ts';

export function projectRoutes(r: Router): void {
  r.get('/projects', () => listProjects());
  r.get('/projects/:id', ({ params }) => getProject(params.id));
  r.post('/projects', ({ body, userId }) => {
    if (!userId) throw new ForbiddenError('sign in to create projects');
    return reply(201, createProject(body ?? {}, userId));
  });
  r.patch('/projects/:id', ({ params, body }) => renameProject(params.id, body ?? {}));
  r.post('/projects/:id/archive', ({ params }) => archiveProject(params.id));
  r.post('/projects/:id/unarchive', ({ params }) => unarchiveProject(params.id));
  r.delete('/projects/:id', ({ params }) => {
    deleteProject(params.id);
    return reply(204, undefined);
  });
}
