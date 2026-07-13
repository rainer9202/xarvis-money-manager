import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/lib/hooks/use-categories';
import { useMovement } from '@/lib/hooks/use-movements';
import { getMovementTypeColor } from '@/lib/category-color';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPES, type MovementType } from '@/lib/movement-type';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * View 1 of the create/edit movement flow: pick the movement type, then pick
 * one of that type's categories (icon grid) — entering the actual amount/
 * account/date form (view 2, app/add-movement.tsx) only happens after a
 * category is chosen. Reached from the FAB (create, no `id`) or the
 * movement-detail sheet's Edit button (edit, via `id` — preselects that
 * movement's current type/category).
 */
export default function SelectCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: editingMovement } = useMovement(id);

  const { data: categories, isLoading } = useCategories();
  const [movementType, setMovementType] = useState<MovementType>(
    () => editingMovement?.movementType ?? MOVEMENT_TYPES[0],
  );

  const categoryOptions = (categories ?? []).filter((category) => category.movementType === movementType);

  // `router.back()` alone is a no-op when this screen has no in-app history
  // to pop to — e.g. a hard refresh (or a direct link) lands here with an
  // empty stack on web. Fall back to Home so the button always does
  // something instead of silently failing.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)'));

  const selectCategory = (categoryId: string) => {
    router.push({
      pathname: '/add-movement',
      params: id ? { id, movementType, categoryId } : { movementType, categoryId },
    });
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-4">
        <Text className="text-lg font-semibold text-neutral-50">{id ? 'Editar movimiento' : 'Agregar movimiento'}</Text>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
          <Ionicons name="close" size={24} color="#fafafa" />
        </Pressable>
      </View>

      <View className="px-4 pb-2 pt-4">
        <View className="flex-row rounded-2xl border border-neutral-800 bg-neutral-900 p-1">
          {MOVEMENT_TYPES.map((type) => (
            <Pressable
              key={type}
              className="flex-1 items-center rounded-xl py-2.5"
              style={movementType === type ? { backgroundColor: getMovementTypeColor(type) } : undefined}
              onPress={() => setMovementType(type)}
              accessibilityRole="button"
              accessibilityLabel={MOVEMENT_TYPE_LABELS[type]}
            >
              <Text
                className={
                  movementType === type ? 'text-sm font-bold text-neutral-950' : 'text-sm font-medium text-neutral-400'
                }
              >
                {MOVEMENT_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#fbbf24" />
        </View>
      ) : (
        <FlatList
          data={categoryOptions}
          keyExtractor={(item) => item.id}
          numColumns={3}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text className="px-2 py-6 text-center text-lg text-neutral-500">
              Todavía no hay nada para {MOVEMENT_TYPE_LABELS[movementType]} — agrega una desde Perfil {'>'} Categorías.
            </Text>
          }
          renderItem={({ item }) => {
            const isCurrent = item.id === editingMovement?.categoryId;
            return (
              <Pressable
                onPress={() => selectCategory(item.id)}
                className="mb-4 items-center px-1"
                style={{ width: '33.33%' }}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                accessibilityState={{ selected: isCurrent }}
              >
                <View
                  className="mb-1.5 h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: getMovementTypeColor(item.movementType),
                    borderWidth: isCurrent ? 3 : 0,
                    borderColor: '#fbbf24',
                  }}
                >
                  <Ionicons name={item.icon as IoniconName} size={24} color="#fafafa" />
                </View>
                <Text
                  numberOfLines={1}
                  className={isCurrent ? 'text-xs font-semibold text-amber-400' : 'text-xs font-medium text-neutral-300'}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      <View className="border-t border-neutral-800 px-4 py-4">
        <Button variant="secondary" onPress={close}>
          Cerrar
        </Button>
      </View>
    </View>
  );
}
