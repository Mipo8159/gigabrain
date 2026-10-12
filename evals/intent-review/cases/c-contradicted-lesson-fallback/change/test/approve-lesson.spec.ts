import { ContentRepository } from '../src/content/content.repository';
import { ContentService } from '../src/content/content.service';
import { ExternalContentService } from '../src/external/external-content.service';
import { ReelService } from '../src/reel/reel.service';
import { LessonService } from '../src/lesson/lesson.service';

describe('approve LESSON', () => {
  const base = { title: 't', category: 'c', coverUrl: 'cv', fileUrl: 'f', type: 'LESSON' as const };
  it('creates a lesson in the course', () => {
    const repo = new ContentRepository(); const lessons = new LessonService();
    const c = new ContentService(repo).create({ ...base, courseId: 'course-1' }, 'u1', 'ge');
    new ExternalContentService(repo, new ReelService(), lessons).approve(c.id);
    expect(lessons.all()[0].courseId).toBe('course-1');
  });
  it('falls back to a reel when the lesson has no course', () => {
    const repo = new ContentRepository(); const reels = new ReelService();
    const c = new ContentService(repo).create(base, 'u1', 'ge');
    new ExternalContentService(repo, reels, new LessonService()).approve(c.id);
    expect(reels.all()).toHaveLength(1);
  });
});
