/** Throw these from services and routes; `handle()` in router.ts turns them into the documented error body. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
  }
}
export class BadRequestError extends AppError {
  constructor(message = 'bad request') { super(400, 'bad_request', message); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'forbidden') { super(403, 'forbidden', message); }
}
export class NotFoundError extends AppError {
  constructor(what: string) { super(404, 'not_found', `${what} not found`); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(409, 'conflict', message); }
}
export class ValidationError extends AppError {
  readonly fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super(422, 'validation_failed', 'validation failed');
    this.fields = fields;
  }
}
