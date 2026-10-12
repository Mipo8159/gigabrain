import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

function setup() {
  const repo = new ContentRepository();
  const reels = new ReelService();
  const lessons = new LessonService();
  return { repo, reels, lessons, content: new ContentService(repo), external: new ExternalContentService(repo, reels, lessons) };
}
const dto = { title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' as const };

describe('approve', () => {
  it('creates a reel for REEL content', () => {
    const s = setup();
    const c = s.content.create(dto, 'u1', 'r1');
    s.external.approve(c.id);
    expect(s.reels.all()).toHaveLength(1);
  });
  it('rejects approving twice', () => {
    const s = setup();
    const c = s.content.create(dto, 'u1', 'r1');
    s.external.approve(c.id);
    expect(() => s.external.approve(c.id)).toThrow(/APPROVED/);
  });
});
