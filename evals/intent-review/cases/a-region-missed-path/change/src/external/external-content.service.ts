import { ContentRepository } from '../content/content.repository';
import { ReelService } from '../reel/reel.service';
import { LessonService } from '../lesson/lesson.service';
import { ConflictError, NotFoundError } from '../auth/user';

export class ExternalContentService {
  constructor(private repo: ContentRepository, private reels: ReelService, private lessons: LessonService) {}

  approve(id: string) {
    const c = this.repo.findById(id);
    if (!c) throw new NotFoundError(id);
    if (c.status !== 'PENDING') throw new ConflictError(`content ${id} is ${c.status}`);
    c.status = 'APPROVED';
    this.repo.save(c);
    if (c.type === 'LESSON') {
      return this.lessons.create({ courseId: c.courseId!, fileUrl: c.fileUrl, title: c.title, creatorId: c.creatorId, regionId: c.regionId });
    }
    return this.reels.create({ fileUrl: c.fileUrl, title: c.title, creatorId: c.creatorId, regionId: c.regionId });
  }
}
