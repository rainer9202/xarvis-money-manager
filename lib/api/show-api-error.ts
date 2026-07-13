import { ApiError } from './errors';

/** Extracts the human-readable message from an API error — shared by
 * `showApiError` (silent, console-only) and any form that needs to surface
 * a domain error inline (e.g. the credit-limit-exceeded message on the
 * movement/account forms) instead of swallowing it. */
export function getApiErrorMessage(error: unknown, fallback = 'Algo salió mal'): string {
  if (error instanceof ApiError) {
    return error.messages[0] ?? fallback;
  }
  return fallback;
}

/**
 * Shared TanStack Query `onError` handler for the CRUD screens where no
 * inline error slot exists. No UI surface (no toasts/alerts) — errors are
 * logged for debugging only, per product decision to keep those actions
 * silent on failure.
 */
export function showApiError(error: unknown, fallback = 'Algo salió mal'): void {
  if (error instanceof ApiError) {
    console.error(getApiErrorMessage(error, fallback));
    return;
  }
  console.error(fallback, error);
}
