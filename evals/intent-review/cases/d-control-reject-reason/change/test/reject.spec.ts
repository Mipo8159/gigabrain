import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

function setup() {
  const repo = new ContentRepository(); const reels = new ReelService(); const lessons = new LessonService();
  const content = new ContentService(repo);
  const c = content.create({ title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' }, 'u1', 'ge');
  return { repo, reels, lessons, c, external: new ExternalContentService(repo, reels, lessons) };
}

describe('reject', () => {
  it('stores the trimmed reason and creates nothing', () => {
    const s = setup();
    const r = s.external.reject(s.c.id, '  blurry video  ');
    expect(r.status).toBe('REJECTED');
    expect(r.rejectionReason).toBe('blurry video');
    expect(s.reels.all()).toHaveLength(0);
    expect(s.lessons.all()).toHaveLength(0);
  });
  it.each([undefined, '', '   ', 'x'.repeat(501)])('400 for reason %p, status unchanged', (reason) => {
    const s = setup();
    expect(() => s.external.reject(s.c.id, reason)).toThrow(expect.objectContaining({ status: 400 }));
    expect(s.repo.findById(s.c.id)!.status).toBe('PENDING');
  });
  it('accepts exactly 500 characters', () => {
    const s = setup();
    expect(s.external.reject(s.c.id, 'x'.repeat(500)).rejectionReason).toHaveLength(500);
  });
  it('409 for non-PENDING content, nothing changes', () => {
    const s = setup();
    s.external.approve(s.c.id);
    expect(() => s.external.reject(s.c.id, 'late')).toThrow(expect.objectContaining({ status: 409 }));
    expect(s.repo.findById(s.c.id)!.status).toBe('APPROVED');
    expect(s.repo.findById(s.c.id)!.rejectionReason).toBeUndefined();
  });
});
