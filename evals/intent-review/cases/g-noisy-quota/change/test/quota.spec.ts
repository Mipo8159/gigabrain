import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { QuotaService } from '../src/quota/quota.service';
import { InMemoryUserDirectory } from '../src/common/users';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

const dto = { title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' as const };

function setup(grades: Record<string, 'RESTRICTED' | 'DEFAULT' | 'PREMIUM'>) {
  const repo = new ContentRepository();
  const content = new ContentService(repo, new QuotaService(repo, new InMemoryUserDirectory(grades)));
  return { repo, content, external: new ExternalContentService(repo, new ReelService(), new LessonService()) };
}

describe('quota', () => {
  it('RESTRICTED: 4th pending item is 429 and not stored', () => {
    const s = setup({ u1: 'RESTRICTED' });
    for (let i = 0; i < 3; i++) s.content.create(dto, 'u1', 'ge');
    expect(() => s.content.create(dto, 'u1', 'ge')).toThrow(expect.objectContaining({ status: 429 }));
    expect(s.repo.countPendingByCreator('u1')).toBe(3);
  });
  it('DEFAULT: 21st pending item is 429', () => {
    const s = setup({});
    for (let i = 0; i < 20; i++) s.content.create(dto, 'u1', 'ge');
    expect(() => s.content.create(dto, 'u1', 'ge')).toThrow(expect.objectContaining({ status: 429 }));
  });
  it('approved items free a slot', () => {
    const s = setup({ u1: 'RESTRICTED' });
    const first = s.content.create(dto, 'u1', 'ge');
    s.content.create(dto, 'u1', 'ge'); s.content.create(dto, 'u1', 'ge');
    s.external.approve(first.id);
    expect(() => s.content.create(dto, 'u1', 'ge')).not.toThrow();
  });
  it('PREMIUM: large batches are fine', () => {
    const s = setup({ u1: 'PREMIUM' });
    for (let i = 0; i < 50; i++) s.content.create(dto, 'u1', 'ge');
    expect(s.repo.countPendingByCreator('u1')).toBe(50);
  });
});
