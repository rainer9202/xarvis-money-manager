import type { MovementType } from '@/lib/movement-type';

import { apiClient } from './client';

// No GET-by-id route exists (for-frontend.md §5.3) — resolve single items by
// filtering the list returned from `listCategories`.
export type Category = {
  id: string;
  name: string;
  /** Ionicons icon name (e.g. "cart-outline") — for-frontend.md §5.3. The
   * backend only stores/validates a non-empty string, it doesn't know or
   * care about the Ionicons set. */
  icon: string;
  /** Stable opaque code — what you send back on create/update. */
  movementType: MovementType;
  /** Server-resolved display text for `movementType`. Always render this
   * for display; never derive it from `movementType` client-side. */
  movementTypeLabel: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateCategoryPayload = {
  name: string;
  icon: string;
  movementType: MovementType;
};

export type UpdateCategoryPayload = Partial<{
  name: string;
  icon: string;
  movementType: MovementType;
  isActive: boolean;
}>;

export function listCategories() {
  return apiClient.get<Category[]>('/categories');
}

export function createCategory(payload: CreateCategoryPayload) {
  return apiClient.post<{ id: string }>('/categories', payload);
}

export function updateCategory(id: string, payload: UpdateCategoryPayload) {
  return apiClient.patch<{ id: string }>(`/categories/${id}`, payload);
}

export function deleteCategory(id: string) {
  return apiClient.delete<{ id: string }>(`/categories/${id}`);
}
