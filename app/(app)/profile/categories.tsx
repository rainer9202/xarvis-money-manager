import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { CategoryFormModal } from '@/components/category-form-modal';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/error-state';
import { IconAction } from '@/components/ui/icon-action';
import { Text } from '@/components/ui/Text';
import { deleteCategory, updateCategory, type Category } from '@/lib/api/categories';
import { getMovementTypeColor } from '@/lib/category-color';
import { showApiError } from '@/lib/api/show-api-error';
import { confirmDestructive } from '@/lib/confirm';
import { categoriesQueryKey, useCategories } from '@/lib/hooks/use-categories';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPES, type MovementType } from '@/lib/movement-type';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Same type pills as app/select-category.tsx — group categories by
// movementType instead of dumping every category (Gasto/Ingreso/
// Transferencia) into one flat list.
export default function CategoriesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const [movementType, setMovementType] = useState<MovementType>(MOVEMENT_TYPES[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  const filteredCategories = (categories ?? []).filter(
    (category) => category.movementType === movementType,
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: invalidate,
    onError: (error) => showApiError(error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateCategory(id, { isActive }),
    onSuccess: invalidate,
    onError: (error) => showApiError(error),
  });

  const openCreate = () => {
    setEditingCategory(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const confirmDelete = (category: Category) => {
    confirmDestructive(
      'Eliminar categoría',
      `¿Eliminar "${category.name}"? Esta acción no se puede deshacer.`,
      () => deleteMutation.mutate(category.id),
    );
  };

  return (
    <View className="flex-1 bg-background">
      <PageHeader title="Categorías" onBack={() => router.back()} />
      <View className="flex-1 px-4 pt-4">
        <Button className="mb-4" onPress={openCreate}>
          Agregar categoría
        </Button>

        <View className="mb-4 flex-row rounded-2xl border border-neutral-800 bg-neutral-900 p-1">
          {MOVEMENT_TYPES.map((type) => (
            <Pressable
              key={type}
              className="flex-1 items-center rounded-xl py-2.5"
              style={
                movementType === type ? { backgroundColor: getMovementTypeColor(type) } : undefined
              }
              onPress={() => setMovementType(type)}
              accessibilityRole="button"
              accessibilityLabel={MOVEMENT_TYPE_LABELS[type]}
            >
              <Text
                numberOfLines={1}
                className={
                  movementType === type
                    ? 'w-full text-center text-base font-bold text-neutral-950'
                    : 'w-full text-center text-base font-medium text-neutral-400'
                }
              >
                {MOVEMENT_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#fbbf24" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text className="text-lg text-neutral-500">
                Todavía no tienes categorías de {MOVEMENT_TYPE_LABELS[movementType]}.
              </Text>
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
                <View
                  className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: getMovementTypeColor(item.movementType) }}
                >
                  <Ionicons name={item.icon as IoniconName} size={16} color="#fafafa" />
                </View>
                <Text numberOfLines={1} className="mr-2 flex-1 text-base font-semibold text-neutral-50">
                  {item.name}
                </Text>

                <View className="flex-row items-center gap-3">
                  <IconAction size="lg" icon="create-outline" label="Editar" onPress={() => openEdit(item)} />
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

        <CategoryFormModal
          visible={isFormOpen}
          category={editingCategory}
          onClose={() => setIsFormOpen(false)}
        />
      </View>
    </View>
  );
}
