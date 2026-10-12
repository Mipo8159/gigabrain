import { Grade } from '../auth/user';

/** Read-only lookup of creator profiles (backed by the users service in prod). */
export interface UserDirectory {
  gradeOf(userId: string): Grade;
}

export class InMemoryUserDirectory implements UserDirectory {
  constructor(private readonly grades: Record<string, Grade> = {}) {}
  gradeOf(userId: string): Grade { return this.grades[userId] ?? 'DEFAULT'; }
}
