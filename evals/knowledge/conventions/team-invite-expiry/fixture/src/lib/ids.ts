import { randomBytes, randomUUID } from 'node:crypto';

export const newId = (prefix: string): string => `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
export const newToken = (): string => randomBytes(24).toString('base64url');
