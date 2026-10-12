import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

const dto = { title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' as const };

describe('delete', () => {
  it('soft-deletes own pending content', () => {
    const s = new ContentService(new ContentRepository());
    const c = s.create(dto, 'u1', 'ge');
    expect(s.delete(c.id, 'u1').deletedAt).toBeDefined();
  });
  it('409 for someone else or non-pending', () => {
    const repo = new ContentRepository(); const s = new ContentService(repo);
    const c = s.create(dto, 'u1', 'ge');
    expect(() => s.delete(c.id, 'u2')).toThrow(expect.objectContaining({ status: 409 }));
    new ExternalContentService(repo, new ReelService(), new LessonService()).approve(c.id);
    expect(() => s.delete(c.id, 'u1')).toThrow(expect.objectContaining({ status: 409 }));
  });
  it('approving deleted content is 409 and creates nothing', () => {
    const repo = new ContentRepository(); const reels = new ReelService(); const s = new ContentService(repo);
    const c = s.create(dto, 'u1', 'ge');
    s.delete(c.id, 'u1');
    expect(() => new ExternalContentService(repo, reels, new LessonService()).approve(c.id)).toThrow(expect.objectContaining({ status: 409 }));
    expect(reels.all()).toHaveLength(0);
  });
});
