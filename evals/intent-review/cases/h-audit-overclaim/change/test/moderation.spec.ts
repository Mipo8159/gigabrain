import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

function setup() {
  const repo = new ContentRepository();
  const content = new ContentService(repo);
  return { repo, content, external: new ExternalContentService(repo, new ReelService(), new LessonService()) };
}
const dto = { title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' as const };

describe('reject', () => {
  it('stores the trimmed reason', () => {
    const s = setup();
    const c = s.content.create(dto, 'u1', 'r1');
    s.external.reject(c.id, '  blurry  ', 'a1');
    expect(s.repo.findById(c.id)).toMatchObject({ status: 'REJECTED', rejectionReason: 'blurry' });
  });
  it('requires a reason', () => {
    const s = setup();
    const c = s.content.create(dto, 'u1', 'r1');
    expect(() => s.external.reject(c.id, '   ', 'a1')).toThrow(/reason/);
  });
  it('rejects non-pending content', () => {
    const s = setup();
    const c = s.content.create(dto, 'u1', 'r1');
    s.external.approve(c.id);
    expect(() => s.external.reject(c.id, 'late', 'a1')).toThrow(/APPROVED/);
  });
});

describe('update', () => {
  it('lets the owner edit title and category', () => {
    const s = setup();
    const c = s.content.create(dto, 'u1', 'r1');
    s.content.update(c.id, 'u1', { title: 'new', category: 'news' });
    expect(s.repo.findById(c.id)).toMatchObject({ title: 'new', category: 'news' });
  });
  it('hides other users\' content', () => {
    const s = setup();
    const c = s.content.create(dto, 'u1', 'r1');
    expect(() => s.content.update(c.id, 'u2', { title: 'x' })).toThrow();
  });
});
