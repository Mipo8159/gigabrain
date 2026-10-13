export type LedgerEntry = {
  entryId: string;
  accountId: string;
  amountCents: number; // positive = credit, negative = debit
  postedAt: string;
};

export const ledger = {
  /** Applies one entry to the account balance (DynamoDB transaction in production). */
  async apply(entry: LedgerEntry): Promise<void> {
    throw new Error(`ledger.apply is wired up at deploy time (entry ${entry.entryId})`);
  },
};
