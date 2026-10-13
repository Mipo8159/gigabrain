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

export type UploadState = (typeof uploadFlow.states)[number];

export function retry(current: UploadState): UploadState {
  return uploadFlow.next(current, 'uploading');
}
