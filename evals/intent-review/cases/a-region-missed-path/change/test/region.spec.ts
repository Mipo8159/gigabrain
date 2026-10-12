import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { MobileContentController } from '../src/content/mobile-content.controller';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

describe('region scoping', () => {
  it('mobile create ignores the header and uses the user region', () => {
    const repo = new ContentRepository();
    const ctrl = new MobileContentController(new ContentService(repo));
    const c = ctrl.create({ user: { id: 'u1', role: 'CREATOR', regionId: 'ge' }, headers: { 'x-region-id': 'us' }, body: { title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' }, params: {} });
    expect(c.regionId).toBe('ge');
  });
  it('approved reel inherits the content region', () => {
    const repo = new ContentRepository();
    const reels = new ReelService();
    const c = new ContentService(repo).create({ title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'REEL' }, 'u1', 'ge');
    new ExternalContentService(repo, reels, new LessonService()).approve(c.id);
    expect(reels.all()[0].regionId).toBe('ge');
  });
});
