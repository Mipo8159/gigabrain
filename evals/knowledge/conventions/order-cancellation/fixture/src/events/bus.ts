/** The message bus client. Production wires the broker client in main; tests install their own. */
export interface DomainEvent { id: string; type: string; payload: unknown; occurredAt: string }

export interface Bus {
  publish(event: DomainEvent): Promise<void>;
}

let current: Bus = {
  async publish() { throw new Error('bus not configured'); },
};

export const getBus = (): Bus => current;
export const setBus = (b: Bus): void => { current = b; };
