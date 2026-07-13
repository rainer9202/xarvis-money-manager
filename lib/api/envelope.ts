/**
 * Success envelope returned by every endpoint on the Xarvis Brain API.
 * See for-frontend.md §3 "Response envelope".
 */
export type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

/**
 * Shape A — class-validator DTO validation failures.
 * `message` is an array of one-per-rule strings.
 */
export type ValidationErrorBody = {
  statusCode: number;
  message: string[];
  error: string;
};

/**
 * Shape B — domain-level errors (NotFoundException, ValidationException,
 * ConflictException) and framework-level errors (401, 429, 503).
 * `message` is a single string; `error` (exception class name) is present
 * for domain errors but may be absent on some framework errors (e.g. the
 * bare `{"statusCode":401,"message":"Unauthorized"}` body).
 */
export type DomainErrorBody = {
  statusCode: number;
  message: string;
  error?: string;
};

export type ApiErrorBody = ValidationErrorBody | DomainErrorBody;
