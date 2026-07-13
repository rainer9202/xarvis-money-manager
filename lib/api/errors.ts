import type { ApiErrorBody } from './envelope';

export type ApiErrorKind = 'validation' | 'domain' | 'network' | 'unknown';

export type ApiErrorParams = {
  kind: ApiErrorKind;
  messages: string[];
  status?: number;
  errorClass?: string;
};

/**
 * Single normalized error shape for the whole app. UI code should branch on
 * `kind` (and `status` for the auth-specific cases: 401 / 429) instead of
 * inspecting the raw response body.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly messages: string[];
  readonly status?: number;
  readonly errorClass?: string;

  constructor({ kind, messages, status, errorClass }: ApiErrorParams) {
    super(messages[0] ?? 'Something went wrong');
    this.name = 'ApiError';
    this.kind = kind;
    this.messages = messages;
    this.status = status;
    this.errorClass = errorClass;
  }
}

/**
 * Normalizes the two documented error-body shapes (for-frontend.md §3) into
 * a single ApiError:
 *  - Shape A (class-validator): `message` is a string[] -> kind: 'validation'
 *  - Shape B (domain / framework, incl. 401/429/503): `message` is a string
 *    -> kind: 'domain'
 * Anything that doesn't match either documented shape becomes 'unknown'.
 */
export function normalizeApiError(status: number, body: unknown): ApiError {
  if (isValidationErrorBody(body)) {
    return new ApiError({
      kind: 'validation',
      messages: body.message,
      status,
      errorClass: body.error,
    });
  }

  if (isDomainErrorBody(body)) {
    return new ApiError({
      kind: 'domain',
      messages: [body.message],
      status,
      errorClass: body.error,
    });
  }

  return new ApiError({
    kind: 'unknown',
    messages: ['Something went wrong. Please try again.'],
    status,
  });
}

function isValidationErrorBody(body: unknown): body is Extract<ApiErrorBody, { message: string[] }> {
  return (
    typeof body === 'object' &&
    body !== null &&
    Array.isArray((body as Record<string, unknown>).message)
  );
}

function isDomainErrorBody(body: unknown): body is Extract<ApiErrorBody, { message: string }> {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).message === 'string'
  );
}
