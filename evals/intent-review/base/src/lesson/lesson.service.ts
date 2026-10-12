export interface Lesson { id: string; courseId: string; fileUrl: string; title: string; creatorId: string; regionId: string | null }

export class LessonService {
  private lessons: Lesson[] = [];
  create(data: Omit<Lesson, 'id'>): Lesson {
    const lesson = { ...data, id: `lesson-${this.lessons.length + 1}` };
    this.lessons.push(lesson);
    return lesson;
  }
  all(): Lesson[] { return this.lessons; }
}
