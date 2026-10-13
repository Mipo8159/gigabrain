export const TICKET_STATUSES = ['open', 'in_progress', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface Ticket {
  id: number;
  title: string;
  status: TicketStatus;
  assignee: string | null;
}
