// Compile-time guard: the shared domain type must keep "missing key" and "undefined" distinct.
import type { ProfilePatch } from '../src/domain.ts';
const ok: ProfilePatch = {};
// @ts-expect-error displayName may be absent, never undefined
const bad: ProfilePatch = { displayName: undefined };
void ok; void bad;
