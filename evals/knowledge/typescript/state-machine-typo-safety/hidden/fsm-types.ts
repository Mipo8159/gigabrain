// Compile-time checks. Each @ts-expect-error must be needed (TS2578 otherwise).
import { defineMachine } from '../src/fsm.ts';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type St = 'idle' | 'busy' | 'done';

const m = defineMachine({ states: ['idle', 'busy', 'done'], initial: 'idle', transitions: { idle: ['busy'], busy: ['done', 'idle'] } });

const initialIsUnion: Equal<typeof m.initial, St> = true;
const statesIsUnion: Equal<(typeof m.states)[number], St> = true;
const nextIsUnion: Equal<ReturnType<typeof m.next>, St> = true;
void initialIsUnion; void statesIsUnion; void nextIsUnion;

m.can('idle', 'busy');
m.next('busy', 'done');

// @ts-expect-error typo in initial
defineMachine({ states: ['idle', 'busy'], initial: 'idel', transitions: {} });

// @ts-expect-error typo in a transition target
defineMachine({ states: ['idle', 'busy'], initial: 'idle', transitions: { idle: ['bussy'] } });

// @ts-expect-error typo in a transition key
defineMachine({ states: ['idle', 'busy'], initial: 'idle', transitions: { idel: ['busy'] } });

// @ts-expect-error unknown state passed to can()
m.can('idle', 'nope');

// @ts-expect-error unknown state passed to next()
m.next('idel', 'busy');

// terminal states may be omitted; no `as const` needed at the call site
const n = defineMachine({ states: ['a', 'b', 'c'], initial: 'a', transitions: { a: ['b'], b: ['c'] } });
const nInitial: Equal<typeof n.initial, 'a' | 'b' | 'c'> = true;
void nInitial;
