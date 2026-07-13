import { useQuery } from '@tanstack/react-query';

import { getMovement, listMovements, type ListMovementsParams } from '@/lib/api/movements';

// Base key stays `['movements']` so `invalidateQueries({ queryKey:
// movementsQueryKey })` (see components/movement-form.tsx, app/add-movement.tsx)
// keeps matching every filtered variant below by prefix, not just one —
// including `useMovement`'s single-id key below.
export const movementsQueryKey = ['movements'] as const;

export function useMovements(params: ListMovementsParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...movementsQueryKey, params.accountId, params.movementType, params.month, params.historic] as const,
    queryFn: () => listMovements(params),
    enabled: options.enabled,
    // Movements change more often (add/edit/delete) than reference data, but
    // a remount-triggered refetch within the same minute is still wasteful;
    // mutations already invalidate this key immediately on success.
    staleTime: 60 * 1000,
  });
}

/** Fetches one movement by id directly (`GET /movements/:id`) — the right
 * way to resolve "the movement the user tapped/is editing" (select-category,
 * add-movement, movement-detail-modal) regardless of how old it is, instead
 * of fetching a filtered list and searching it client-side. */
export function useMovement(id: string | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...movementsQueryKey, 'byId', id] as const,
    queryFn: () => getMovement(id as string),
    enabled: (options.enabled ?? true) && id !== undefined,
    staleTime: 60 * 1000,
  });
}
