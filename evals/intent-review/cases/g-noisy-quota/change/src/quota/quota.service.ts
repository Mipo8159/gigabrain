import { ContentRepository } from '../content/content.repository';
import { UserDirectory } from '../common/users';
import { TooManyRequestsError } from '../auth/user';
import { Logger } from '../common/logger';
import { limitFor } from './quota.policy';

export class QuotaService {
  private readonly log = new Logger('quota');

  constructor(private readonly repo: ContentRepository, private readonly users: UserDirectory) {}

  /** Throws 429 when the creator already holds their grade's number of PENDING items. */
  assertCanCreate(creatorId: string): void {
    const grade = this.users.gradeOf(creatorId);
    const limit = limitFor(grade);
    const pending = this.repo.countPendingByCreator(creatorId);
    if (pending >= limit) {
      this.log.warn('quota exceeded', { creatorId, grade, pending, limit });
      throw new TooManyRequestsError(`pending limit ${limit} reached for ${grade}`);
    }
  }
}
