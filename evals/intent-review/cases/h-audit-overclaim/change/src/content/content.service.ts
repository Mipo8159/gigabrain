import { ContentRepository } from './content.repository';
import { Content, ContentType } from './content.entity';
import { NotFoundError } from '../auth/user';

export interface CreateContentDto {
  title: string; category: string; coverUrl: string; fileUrl: string;
  type: ContentType; courseId?: string;
}

export interface UpdateContentDto { title?: string; category?: string }

export class ContentService {
  constructor(private repo: ContentRepository) {}

  create(dto: CreateContentDto, creatorId: string, regionId: string | null): Content {
    return this.repo.insert({ ...dto, creatorId, regionId, status: 'PENDING' });
  }

  update(id: string, userId: string, dto: UpdateContentDto): Content {
    const c = this.repo.findById(id);
    if (!c || c.creatorId !== userId) throw new NotFoundError(id);
    if (dto.title !== undefined) c.title = dto.title;
    if (dto.category !== undefined) c.category = dto.category;
    c.updatedBy = userId;
    return this.repo.save(c);
  }

  listForRegion(regionId: string): Content[] { return this.repo.listByRegion(regionId); }
}
