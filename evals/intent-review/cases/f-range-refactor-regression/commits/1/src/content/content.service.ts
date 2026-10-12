import { ContentRepository } from './content.repository';
import { Content, ContentType } from './content.entity';
import { ConflictError, NotFoundError } from '../auth/user';

export interface CreateContentDto {
  title: string; category: string; coverUrl: string; fileUrl: string;
  type: ContentType; courseId?: string;
}

export class ContentService {
  constructor(private repo: ContentRepository) {}

  create(dto: CreateContentDto, creatorId: string, regionId: string | null): Content {
    return this.repo.insert({ ...dto, creatorId, regionId, status: 'PENDING' });
  }

  delete(id: string, userId: string): Content {
    const c = this.repo.findById(id);
    if (!c || c.deletedAt) throw new NotFoundError(id);
    if (c.creatorId !== userId || c.status !== 'PENDING') throw new ConflictError(`cannot delete ${id}`);
    c.deletedAt = new Date().toISOString();
    return this.repo.save(c);
  }

  listForRegion(regionId: string): Content[] { return this.repo.listByRegion(regionId); }
}
