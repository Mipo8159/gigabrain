export type Role = 'CREATOR' | 'ADMIN';
export type Grade = 'RESTRICTED' | 'DEFAULT' | 'PREMIUM';

export interface AuthUser {
  id: string;
  role: Role;
  regionId: string;
  grade: Grade;
}

export class HttpError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export class ConflictError extends HttpError { constructor(m: string) { super(m, 409); } }
export class BadRequestError extends HttpError { constructor(m: string) { super(m, 400); } }
export class NotFoundError extends HttpError { constructor(m: string) { super(m, 404); } }
export class TooManyRequestsError extends HttpError { constructor(m: string) { super(m, 429); } }
