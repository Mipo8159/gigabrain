import { defineMachine } from '../fsm.ts';

export const uploadFlow = defineMachine({
  states: ['idle', 'uploading', 'processing', 'done', 'failed'],
  initial: 'idle',
  transitions: {
    idle: ['uploading'],
    uploading: ['processing', 'failed'],
    processing: ['done', 'failed'],
    failed: ['uploading'],
  },
});

export function retry(current: string): string {
  return uploadFlow.next(current, 'uploading');
}
