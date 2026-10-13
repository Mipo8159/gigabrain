import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  email: string;
  active: boolean;
}

// 25 users; every third one (ids 3, 6, 9, ...) is deactivated.
const SEED: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  email: `user${i + 1}@example.test`,
  active: (i + 1) % 3 !== 0,
}));

@Injectable()
export class UsersRepository {
  all(): User[] {
    return SEED.map((u) => ({ ...u }));
  }
}
