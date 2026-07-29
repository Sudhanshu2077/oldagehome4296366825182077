export interface ErrorDetail {
  field?: string | undefined;
  message: string;
  code?: string | undefined;
}

export interface ErrorResponseShape {
  error: string;
  message: string;
  details?: ErrorDetail[];
  requestId: string;
}

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  details?: ErrorDetail[];
  readonly requestId?: string;

  constructor(message = 'application error', details?: ErrorDetail[]) {
    super(message);
    this.name = this.constructor.name;
    if (details) this.details = details;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'validation_error';
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'unauthorized';
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'forbidden';
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'not_found';
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'conflict';
}

export class TenantScopeMissingError extends AppError {
  readonly statusCode = 403;
  readonly code = 'tenant_scope_missing';
  constructor() {
    super('tenant scope missing for current request');
  }
}

export class RateLimitedError extends AppError {
  readonly statusCode = 429;
  readonly code = 'rate_limited';
}

export class LockoutError extends AppError {
  readonly statusCode = 423;
  readonly code = 'account_locked';
}

export class AuthUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = 'auth_unavailable';
}

export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code = 'internal';
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function toErrorResponse(err: AppError, requestId: string): ErrorResponseShape {
  const base: ErrorResponseShape = {
    error: err.code,
    message: err.message,
    requestId,
  };
  if (err.details && err.details.length > 0) base.details = err.details;
  return base;
}
