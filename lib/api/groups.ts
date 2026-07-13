import { apiClient } from './client';

// No GET-by-id route exists (for-frontend.md §5.1) — resolve single items by
// filtering the list returned from `listGroups`.
export type Group = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateGroupPayload = {
  name: string;
};

export type UpdateGroupPayload = Partial<{
  name: string;
  isActive: boolean;
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
