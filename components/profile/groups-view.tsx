import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { GroupFormModal } from '@/components/group-form-modal';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/error-state';
import { IconAction } from '@/components/ui/icon-action';
import { Text } from '@/components/ui/Text';
import { deleteGroup, updateGroup, type Group } from '@/lib/api/groups';
import { showApiError } from '@/lib/api/show-api-error';
import { confirmDestructive } from '@/lib/confirm';
import { formatCents } from '@/lib/format-money';
import { groupsQueryKey, useGroups } from '@/lib/hooks/use-groups';

// A Group is a lightweight per-movement tag (for-frontend.md §5.1) — unlike
// Category it has no movementType/icon of its own, so every row uses the
// same neutral glyph instead of a per-item color/icon.
export function GroupsView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: groups, isLoading, isError, refetch } = useGroups();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: groupsQueryKey });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: invalidate,
    onError: (error) => showApiError(error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateGroup(id, { isActive }),
    onSuccess: invalidate,
    onError: (error) => showApiError(error),
  });

  const openCreate = () => {
    setEditingGroup(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const confirmDelete = (group: Group) => {
    // No delete-guard on the backend — deleting a Group that's still
    // referenced by movements succeeds and just clears their `groupId`
    // (for-frontend.md §5.1), so no "in use" warning needed here.
    confirmDestructive(
      'Eliminar grupo',
      `¿Eliminar "${group.name}"? Esta acción no se puede deshacer.`,
      () => deleteMutation.mutate(group.id),
    );
  };

  return (
    <View className="flex-1 bg-background">
      <PageHeader title="Grupos" onBack={onBack} />
      <View className="flex-1 px-4 pt-4">
        <Button className="mb-4" onPress={openCreate}>
          Agregar grupo
        </Button>

        {isLoading ? (
          <ActivityIndicator color="#fbbf24" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={groups ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text className="text-lg text-neutral-500">Todavía no tienes grupos.</Text>
            }
            renderItem={({ item }) => (
              <Card
                className="mb-4 flex-row items-center"
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderColor: !item.isActive ? '#525252' : undefined,
                }}
              >
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-card-raised">
                  <Ionicons name="albums-outline" size={16} color="#fafafa" />
                </View>
                <View className="mr-2 flex-1">
                  <Text numberOfLines={1} className="text-base font-semibold text-neutral-50">
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-sm text-neutral-500">
                    {item.budgetCents !== null
                      ? `Presupuesto: ${formatCents(item.budgetCents)}`
                      : 'Sin presupuesto'}
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <IconAction
                    size="lg"
                    icon="create-outline"
                    label="Editar"
                    onPress={() => openEdit(item)}
                  />
                  <IconAction
                    size="lg"
                    icon={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    label={item.isActive ? 'Desactivar' : 'Activar'}
                    isLoading={
                      toggleActiveMutation.isPending &&
                      toggleActiveMutation.variables?.id === item.id
                    }
                    onPress={() =>
                      toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive })
                    }
                  />
                  <IconAction
                    size="lg"
                    icon="trash-outline"
                    label="Eliminar"
                    color="#ef4444"
                    isLoading={deleteMutation.isPending && deleteMutation.variables === item.id}
                    onPress={() => confirmDelete(item)}
                  />
                </View>
              </Card>
            )}
          />
        )}

        <GroupFormModal
          visible={isFormOpen}
          group={editingGroup}
          onClose={() => setIsFormOpen(false)}
        />
      </View>
    </View>
  );
}
