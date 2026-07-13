import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MovementForm } from '@/components/movement-form';
import { Text } from '@/components/ui/Text';
import { useMovement } from '@/lib/hooks/use-movements';
import type { MovementType } from '@/lib/movement-type';

/**
 * View 2 of the create/edit movement flow (not a modal) — the actual
 * amount/account/date form. Only ever reached from app/select-category.tsx
 * (view 1), which always supplies `movementType` + `categoryId` as params;
 * those two are fixed here, not editable — "change category" means going
 * back to view 1, not overriding them in place. Editing an existing
 * movement (`id` present) still preloads the rest of its fields.
 */
export default function AddMovementScreen() {
  const router = useRouter();
  const { id, movementType, categoryId } = useLocalSearchParams<{
    id?: string;
    movementType?: MovementType;
    categoryId?: string;
  }>();
  const { data: movement } = useMovement(id);

  useEffect(() => {
    if (!movementType || !categoryId) router.replace('/select-category');
  }, [movementType, categoryId, router]);

  // See select-category.tsx's `close` for why this isn't a plain
  // `router.back()` — a hard refresh/direct link can land here with no
  // in-app history to pop to.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)'));

  // A successful create/edit always lands back on Home, not one step back
  // to view 1 (select-category) — `router.back()` would only pop the
  // add-movement screen, leaving select-category on the stack.
  const goHome = () => router.replace('/(app)');

  if (!movementType || !categoryId) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 border-b border-neutral-800 px-6 py-4">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#fafafa" />
        </Pressable>
        <Text className="text-lg font-semibold text-neutral-50">{movement ? 'Editar movimiento' : 'Agregar movimiento'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <MovementForm movement={movement} movementType={movementType} categoryId={categoryId} onDone={goHome} />
      </ScrollView>
    </View>
  );
}
