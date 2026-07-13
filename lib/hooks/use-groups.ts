import { useQuery } from '@tanstack/react-query';

import { listGroups } from '@/lib/api/groups';

export const groupsQueryKey = ['groups'] as const;

export function useGroups() {
  return useQuery({
    queryKey: groupsQueryKey,
    queryFn: listGroups,
    // Groups rarely change — avoid a background refetch on every remount;
    // mutations already invalidate this key immediately on success.
    staleTime: 5 * 60 * 1000,
  });
}
