import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineMachine } from '../src/fsm.ts';
import { uploadFlow } from '../src/flows/upload.ts';

test('runtime behaviour is unchanged', () => {
  const m = defineMachine({ states: ['idle', 'busy', 'done'], initial: 'idle', transitions: { idle: ['busy'], busy: ['done'] } });
  assert.equal(m.initial, 'idle');
  assert.deepEqual([...m.states], ['idle', 'busy', 'done']);
  assert.equal(m.can('idle', 'busy'), true);
  assert.equal(m.can('done', 'idle'), false);
  assert.equal(m.next('busy', 'done'), 'done');
  assert.throws(() => m.next('idle', 'done'));
  assert.equal(uploadFlow.next('failed', 'uploading'), 'uploading');
  assert.throws(() => uploadFlow.next('done', 'uploading'));
});
