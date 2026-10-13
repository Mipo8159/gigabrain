import { Controller, Get } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersRepository) {}

  @Get()
  list() {
    return this.users.all();
  }
}
