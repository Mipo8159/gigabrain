export type Machine<S extends string> = {
  readonly states: readonly S[];
  readonly initial: S;
  can(from: S, to: S): boolean;
  /** Returns `to` if the move is allowed, throws otherwise. */
  next(from: S, to: S): S;
};

export function defineMachine<const S extends string>(config: {
  states: readonly S[];
  initial: NoInfer<S>;
  transitions: { readonly [K in NoInfer<S>]?: readonly NoInfer<S>[] };
}): Machine<S> {
  const { states, initial, transitions } = config;
  if (!states.includes(initial)) throw new Error(`unknown initial state ${initial}`);
  const can = (from: S, to: S): boolean => (transitions[from] ?? []).includes(to);
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
