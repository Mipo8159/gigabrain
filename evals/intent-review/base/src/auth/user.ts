export type Role = 'CREATOR' | 'ADMIN';
export interface AuthUser { id: string; role: Role; regionId: string }
export class ConflictError extends Error { status = 409 }
export class BadRequestError extends Error { status = 400 }
export class NotFoundError extends Error { status = 404 }
