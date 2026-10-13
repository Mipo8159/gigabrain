import { Injectable } from '@nestjs/common';
import { Ticket } from './ticket';

const SEED: Ticket[] = [
  { id: 1, title: 'Login page 500s', status: 'open', assignee: 'ana' },
  { id: 2, title: 'Export to CSV', status: 'in_progress', assignee: 'ana' },
  { id: 3, title: 'Typo in footer', status: 'closed', assignee: 'ben' },
  { id: 4, title: 'Slow search', status: 'open', assignee: 'ben' },
  { id: 5, title: 'Dark mode', status: 'open', assignee: null },
  { id: 6, title: 'Billing webhook retries', status: 'closed', assignee: 'ana' },
];

@Injectable()
export class TicketsRepository {
  private readonly tickets: Ticket[] = SEED.map((t) => ({ ...t }));

  all(): Ticket[] {
    return this.tickets.map((t) => ({ ...t }));
  }
}
