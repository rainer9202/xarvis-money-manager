import { useQuery } from '@tanstack/react-query';

import { listAccounts } from '@/lib/api/accounts';

export const accountsQueryKey = ['accounts'] as const;

export function useAccounts() {
  return useQuery({
    queryKey: accountsQueryKey,
    queryFn: listAccounts,
    // Accounts rarely change (create/rename/delete are occasional user
    // actions) — avoid a background refetch on every remount; mutations
    // already invalidate this key immediately on success.
    staleTime: 5 * 60 * 1000,
  });
}
