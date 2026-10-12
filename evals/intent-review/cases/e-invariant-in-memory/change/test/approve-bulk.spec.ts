import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

function setup() {
  const repo = new ContentRepository(); const reels = new ReelService();
  return { repo, reels, content: new ContentService(repo), external: new ExternalContentService(repo, reels, new LessonService()) };
}
const clip = { title: 't', category: 'challenge', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' as const };

describe('approveBulk', () => {
  it('approves each id and reports failures without stopping', () => {
    const s = setup();
    const a = s.content.create(clip, 'u1', 'ge');
    const b = s.content.create(clip, 'u2', 'ge');
    s.external.approve(b.id);
    const r = s.external.approveBulk([a.id, b.id, 'missing']);
    expect(r.approved).toEqual([a.id]);
    expect(r.failed).toEqual([{ id: b.id, reason: 'is APPROVED' }, { id: 'missing', reason: 'not found' }]);
    expect(s.reels.all()).toHaveLength(2);
  });
  it.each([[[]], [Array.from({ length: 101 }, (_, i) => String(i))]])('400 for %p ids', (ids) => {
    expect(() => setup().external.approveBulk(ids)).toThrow(expect.objectContaining({ status: 400 }));
  });
});
