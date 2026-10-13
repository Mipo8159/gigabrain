export class AppError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}
export class NotFoundError extends AppError {
  constructor(what: string) { super(`${what} not found`, 404); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'unauthorized') { super(message, 401); }
}
export class TokenExpiredError extends AppError {
  constructor(message = 'token expired') { super(message, 410); }
}
export class InviteExpiredError extends AppError {
  constructor() { super('invite expired', 410); }
}
