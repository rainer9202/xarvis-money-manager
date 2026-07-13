import type { MovementType } from '@/lib/movement-type';

import { apiClient } from './client';

// `note` and `toAccountId` are omitted/undefined on the wire when not set
// (for-frontend.md §5.4) — do not assume they're always present keys.
export type Movement = {
  id: string;
  amountCents: number;
  date: string;
  note?: string;
  accountId: string;
  toAccountId?: string;
  categoryId: string;
  /** Server-resolved display text for `categoryId` (the category's name).
   * Always render this for display instead of a separate categories lookup —
   * live-confirmed on GET /movements/GET /movements/:id even though
   * for-frontend.md doesn't document it yet. */
  categoryLabel: string;
  /** Stable opaque code — what you send back on create/update. */
  movementType: MovementType;
  /** Server-resolved display text for `movementType`. Always render this
   * for display; never derive it from `movementType` client-side. */
  movementTypeLabel: string;
  /** Optional lightweight per-movement tag — for-frontend.md §5.1. Linked
   * to Movement, not Category. Omitted/undefined when not set. */
  groupId?: string;
  /** Server-resolved display text for `groupId` (the group's name).
   * Undefined whenever `groupId` is undefined. */
  groupLabel?: string;
  createdAt: string;
};

export type CreateMovementPayload = {
  amountCents: number;
  date: string;
  note?: string;
  accountId: string;
  categoryId: string;
  movementType: MovementType;
  /** Required (and only allowed) when movementType is `"MT03"`.
   * `JSON.stringify` drops `undefined` values, so passing `undefined` here
   * for a non-transfer movement correctly omits the key from the wire body
   * instead of sending `toAccountId: null`. */
  toAccountId?: string;
  groupId?: string;
};

// `groupId` has three distinct states on PATCH (for-frontend.md §5.4):
// omit → unchanged, `null` → clear, a uuid → re-validate and set. Every
// other field keeps the plain "send it or don't" Partial<> semantics.
export type UpdateMovementPayload = Partial<Omit<CreateMovementPayload, 'groupId'>> & {
  groupId?: string | null;
};

// GET /movements accepts combinable query params — accountId, movementType,
// groupId, month (YYYY-MM), historic — per for-frontend.md §5.4. Confirmed
// live via curl (2026-07-12): server-side filtering IS active now (an
// explicit `month` narrows correctly, `historic=true` returns full history).
// Without `month` and without `historic`, the backend now defaults to the
// last 3 calendar months (not full history) — pass `historic: true`
// whenever you need data older than that. Client-side filtering
// (app/(app)/index.tsx, app/(app)/charts.tsx, lib/hooks/use-account-month-
// movements.ts) is kept as a defensive safety net, not because the backend
// is unreliable.
export type ListMovementsParams = {
  accountId?: string;
  movementType?: MovementType;
  month?: string;
  historic?: boolean;
};

export function listMovements(params: ListMovementsParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.accountId !== undefined) searchParams.set('accountId', params.accountId);
  if (params.movementType !== undefined) searchParams.set('movementType', params.movementType);
  if (params.month !== undefined) searchParams.set('month', params.month);
  if (params.historic !== undefined) searchParams.set('historic', String(params.historic));

  const queryString = searchParams.toString();
  return apiClient.get<Movement[]>(`/movements${queryString ? `?${queryString}` : ''}`);
}

/** Fetches a single movement directly (for-frontend.md §5.4) instead of
 * pulling a filtered list and searching it client-side — the right way to
 * resolve "the movement the user just tapped/is editing" regardless of how
 * old it is, without an unbounded `historic: true` fetch. */
export function getMovement(id: string) {
  return apiClient.get<Movement>(`/movements/${id}`);
}

export function createMovement(payload: CreateMovementPayload) {
  return apiClient.post<{ id: string }>('/movements', payload);
}

export function updateMovement(id: string, payload: UpdateMovementPayload) {
  return apiClient.patch<{ id: string }>(`/movements/${id}`, payload);
}

export function deleteMovement(id: string) {
  return apiClient.delete<{ id: string }>(`/movements/${id}`);
}
