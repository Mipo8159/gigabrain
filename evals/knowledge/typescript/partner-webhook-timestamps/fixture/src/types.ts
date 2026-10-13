export type Settlement = {
  id: string;
  occurredAt: Date;
  /** null while pending */
  settledAt: Date | null;
  amountCents: number;
  currency: string;
  reference?: string;
};
