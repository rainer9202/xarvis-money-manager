import { apiClient } from './client';

// No GET-by-id route exists (for-frontend.md §5.1) — resolve single items by
// filtering the list returned from `listGroups`.
export type Group = {
  id: string;
  name: string;
  isActive: boolean;
  /** Optional maximum-spending cap, in cents — `null` when no cap is set.
   * Purely informational (for-frontend.md §5.1): nothing on the backend
   * blocks a movement from being assigned to a group already over budget. */
  budgetCents: number | null;
  createdAt: string;
};

export type CreateGroupPayload = {
  name: string;
  /** Omit entirely for no cap; must be `>= 1` if present. */
  budgetCents?: number;
};

export type UpdateGroupPayload = Partial<{
  name: string;
  isActive: boolean;
  /** Three-state per for-frontend.md §5.1: omit to leave the cap unchanged,
   * `null` to clear it, a number (`>= 1`) to set/replace it. */
  budgetCents: number | null;
}>;

export function listGroups() {
  return apiClient.get<Group[]>('/groups');
}

export function createGroup(payload: CreateGroupPayload) {
  return apiClient.post<{ id: string }>('/groups', payload);
}

export function updateGroup(id: string, payload: UpdateGroupPayload) {
  return apiClient.patch<{ id: string }>(`/groups/${id}`, payload);
}

export function deleteGroup(id: string) {
  return apiClient.delete<{ id: string }>(`/groups/${id}`);
}
