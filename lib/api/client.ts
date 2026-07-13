import { API_URL } from '@/lib/config';
import { sessionStore } from '@/store/session-store';

import { ApiError, normalizeApiError } from './errors';
import type { ApiEnvelope } from './envelope';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  /** Attach `Authorization: Bearer <token>`. Default true — set false for
   * the two unauthenticated auth routes. */
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (auth) {
    const token = sessionStore.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      // Money and every other field on the wire is already primitive
      // (cents, strings, ISO dates) — this module never introduces floats,
      // it only serializes whatever typed payload the caller passed in.
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({
      kind: 'network',
      messages: ['Unable to reach the server. Check your connection and try again.'],
    });
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // No/invalid JSON body (e.g. some 5xx responses) — fall through, the
    // status check below still handles it as an error.
    json = null;
  }

  if (!response.ok) {
    const apiError = normalizeApiError(response.status, json);

    // Only an authenticated call's 401 means the session is dead — a 401
    // from an unauthenticated call (sign-in/sign-up) is just "wrong
    // credentials" and must not clear an unrelated, currently-valid session.
    if (auth && response.status === 401) {
      // There is no refresh-token endpoint (for-frontend.md §2.4) — any 401
      // means the session is dead. Clear it so the root layout's auth gate
      // routes the user back to sign-in.
      void sessionStore.clearSession();
    }

    throw apiError;
  }

  return (json as ApiEnvelope<T>).data;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
