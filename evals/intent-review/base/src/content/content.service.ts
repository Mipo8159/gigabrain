import { ContentRepository } from './content.repository';
import { Content, ContentType } from './content.entity';

export interface CreateContentDto {
  title: string; category: string; coverUrl: string; fileUrl: string;
  type: ContentType; courseId?: string;
}

export class ContentService {
  constructor(private repo: ContentRepository) {}

  create(dto: CreateContentDto, creatorId: string, regionId: string | null): Content {
    return this.repo.insert({ ...dto, creatorId, regionId, status: 'PENDING' });
  }
  listForRegion(regionId: string): Content[] { return this.repo.listByRegion(regionId); }
}
