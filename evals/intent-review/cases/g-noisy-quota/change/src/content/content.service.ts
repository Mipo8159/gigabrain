import { ContentRepository } from './content.repository';
import { Content, ContentType } from './content.entity';
import { QuotaService } from '../quota/quota.service';
import { Logger } from '../common/logger';

export interface CreateContentDto {
  title: string;
  category: string;
  coverUrl: string;
  fileUrl: string;
  type: ContentType;
  courseId?: string;
}

export class ContentService {
  private readonly log = new Logger('content');

  constructor(private readonly repo: ContentRepository, private readonly quota: QuotaService) {}

  /** Creates a PENDING item for `creatorId`, enforcing that creator's quota first. */
  create(dto: CreateContentDto, creatorId: string, regionId: string | null): Content {
    this.quota.assertCanCreate(creatorId);
    const row = this.repo.insert({ ...dto, creatorId, regionId, status: 'PENDING' });
    this.log.info('content created', { id: row.id, creatorId, type: row.type });
    return row;
  }

  listForRegion(regionId: string): Content[] {
    return this.repo.listByRegion(regionId);
  }
}
