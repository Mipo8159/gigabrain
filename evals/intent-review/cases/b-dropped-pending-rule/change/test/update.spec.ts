import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';

describe('update', () => {
  const dto = { title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' as const };
  it('updates editable fields and records the editor', () => {
    const s = new ContentService(new ContentRepository());
    const c = s.create(dto, 'u1', 'ge');
    const u = s.update(c.id, { title: 'new', coverUrl: 'cv2' }, 'u1');
    expect(u.title).toBe('new');
    expect(u.coverUrl).toBe('cv2');
    expect(u.updatedBy).toBe('u1');
  });
  it('ignores fields outside the allow-list', () => {
    const s = new ContentService(new ContentRepository());
    const c = s.create(dto, 'u1', 'ge');
    const u = s.update(c.id, { fileUrl: 'evil' } as any, 'u1');
    expect(u.fileUrl).toBe('f');
  });
});
