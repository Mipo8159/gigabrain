import { ContentRepository } from '../content/content.repository';
import { ReelService } from '../reel/reel.service';
import { LessonService } from '../lesson/lesson.service';
import { BadRequestError, ConflictError, NotFoundError } from '../auth/user';

export interface BulkResult { approved: string[]; failed: { id: string; reason: string }[] }

export class ExternalContentService {
  constructor(private repo: ContentRepository, private reels: ReelService, private lessons: LessonService) {}

  approve(id: string) {
    const c = this.repo.findById(id);
    if (!c) throw new NotFoundError(id);
    if (c.status !== 'PENDING') throw new ConflictError(`content ${id} is ${c.status}`);
    c.status = 'APPROVED';
    this.repo.save(c);
    if (c.type === 'LESSON') {
      return this.lessons.create({ courseId: c.courseId!, fileUrl: c.fileUrl, title: c.title, creatorId: c.creatorId, regionId: null });
    }
    return this.reels.create({ fileUrl: c.fileUrl, title: c.title, creatorId: c.creatorId, regionId: null });
  }

  // Challenge batches are short clips, so publish straight to the feed.
  approveBulk(ids: string[]): BulkResult {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100) {
      throw new BadRequestError('ids must contain 1-100 items');
    }
    const result: BulkResult = { approved: [], failed: [] };
    for (const id of ids) {
      const c = this.repo.findById(id);
      if (!c) { result.failed.push({ id, reason: 'not found' }); continue; }
      if (c.status !== 'PENDING') { result.failed.push({ id, reason: `is ${c.status}` }); continue; }
      c.status = 'APPROVED';
      this.repo.save(c);
      this.reels.create({ fileUrl: c.fileUrl, title: c.title, creatorId: c.creatorId, regionId: null });
      result.approved.push(id);
    }
    return result;
  }
}
