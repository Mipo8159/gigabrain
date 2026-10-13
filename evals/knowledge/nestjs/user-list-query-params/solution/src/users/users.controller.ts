import { Controller, Get, Query } from '@nestjs/common';
import { ListUsersQuery } from './list-users.query';
import { UsersRepository } from './users.repository';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersRepository) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    const { active, page, limit } = query;
    const filtered = this.users
      .all()
      .filter((u) => active === undefined || u.active === active)
      .sort((a, b) => a.id - b.id);
    return { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit };
  }
}
