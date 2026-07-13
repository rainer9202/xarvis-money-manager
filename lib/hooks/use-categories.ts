import { useQuery } from '@tanstack/react-query';

import { listCategories } from '@/lib/api/categories';

export const categoriesQueryKey = ['categories'] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: listCategories,
    // Categories rarely change — avoid a background refetch on every
    // remount; mutations already invalidate this key immediately on success.
    staleTime: 5 * 60 * 1000,
  });
}
