// Entrypoint of the label-worker Deployment: `node src/worker.ts`.
// TODO (see ticket)
import { kafka } from './kafka.ts';
import { printLabel } from './labels.ts';

void kafka;
void printLabel;
