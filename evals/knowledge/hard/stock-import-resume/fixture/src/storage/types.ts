import type { Readable } from 'node:stream';

/** Read side of the object store the warehouses upload into. */
export interface ObjectStorage {
  /** Opens the object as a byte stream (Buffers of arbitrary size, split anywhere). */
  open(key: string): Promise<Readable>;
  /** Size in bytes, or null if the object does not exist. */
  size(key: string): Promise<number | null>;
}
