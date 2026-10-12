import { ContentRepository } from './content.repository';
import { Content, ContentType } from './content.entity';
import { NotFoundError } from '../auth/user';

export interface CreateContentDto {
  title: string; category: string; coverUrl: string; fileUrl: string;
  type: ContentType; courseId?: string;
}

export interface UpdateContentDto { title?: string; category?: string; coverUrl?: string }

export class ContentService {
  constructor(private repo: ContentRepository) {}

  create(dto: CreateContentDto, creatorId: string, regionId: string | null): Content {
    return this.repo.insert({ ...dto, creatorId, regionId, status: 'PENDING' });
  }

  update(id: string, body: UpdateContentDto, userId: string): Content {
    const c = this.repo.findById(id);
    if (!c) throw new NotFoundError(id);
    const { title, category, coverUrl } = body;
    if (title !== undefined) c.title = title;
    if (category !== undefined) c.category = category;
    if (coverUrl !== undefined) c.coverUrl = coverUrl;
    c.updatedBy = userId;
    return this.repo.save(c);
  }

  listForRegion(regionId: string): Content[] { return this.repo.listByRegion(regionId); }
}
