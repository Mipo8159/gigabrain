import { Injectable } from '@nestjs/common';
import { Ticket } from './ticket';
import { TicketsRepository } from './tickets.repository';

@Injectable()
export class TicketsService {
  constructor(private readonly repo: TicketsRepository) {}

  list(): Ticket[] {
    return this.repo.all();
  }
}
