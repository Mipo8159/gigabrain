export type Machine = {
  readonly states: readonly string[];
  readonly initial: string;
  can(from: string, to: string): boolean;
  /** Returns `to` if the move is allowed, throws otherwise. */
  next(from: string, to: string): string;
};

export function defineMachine(config: {
  states: readonly string[];
  initial: string;
  transitions: Record<string, readonly string[]>;
}): Machine {
  const { states, initial, transitions } = config;
  if (!states.includes(initial)) throw new Error(`unknown initial state ${initial}`);
  const can = (from: string, to: string): boolean => (transitions[from] ?? []).includes(to);
  return {
    states,
    initial,
    can,
    next(from, to) {
      if (!can(from, to)) throw new Error(`illegal transition ${from} -> ${to}`);
      return to;
    },
  };
}
