import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovementDetail } from '@/components/movement-detail';
import { Text } from '@/components/ui/Text';
import { deleteMovement } from '@/lib/api/movements';
import { confirmDestructive } from '@/lib/confirm';
import { showApiError } from '@/lib/api/show-api-error';
import { accountsQueryKey, useAccounts } from '@/lib/hooks/use-accounts';
import { movementsQueryKey, useMovement } from '@/lib/hooks/use-movements';
import { useMovementModalStore } from '@/store/movement-modal-store';

/**
 * Read-only movement detail bottom-sheet — opened from a Home row tap
 * (`app/(app)/index.tsx`) via `useMovementModalStore` rather than route
 * params, since it's driven by local UI state, not navigation. Editing
 * (and creating) are separate full pages starting at app/select-category.tsx
 * (pick the category first, then app/add-movement.tsx for the rest) — this
 * sheet's Edit button pushes there instead of toggling a form in place.
 *
 * No entrance/exit animation, appears and disappears instantly — matches
 * AccountPickerModal/MonthPickerModal (product decision).
 */
export function MovementDetailModal() {
  const router = useRouter();
  const movementId = useMovementModalStore((state) => state.movementId);
  const close = useMovementModalStore((state) => state.close);
  const isOpen = movementId !== null;

  const queryClient = useQueryClient();
  // This component is mounted once at the tab-layout level (always present,
  // regardless of whether the sheet is open), so without `enabled` it would
  // fetch on every app load just to be ready in case a row gets tapped —
  // gate it to only fire once there's actually a movement to look up.
  const { data: movement, isLoading: isLoadingMovements } = useMovement(movementId ?? undefined, {
    enabled: isOpen,
  });
  const { data: accounts } = useAccounts();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // insets.top can report 0 on Android when the edge-to-edge inset dispatch
  // hasn't kicked in yet — StatusBar.currentHeight is a reliable floor.
  const topInset =
    Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;
  const sheetMaxHeight = windowHeight - topInset - 24;

  const deleteMutation = useMutation({
    mutationFn: deleteMovement,
    onSuccess: () => {
      // `refetchType: 'all'` (not the default 'active') — `close()` right
      // after this flips the sheet's own `enabled` gate to false in the same
      // tick, so relying on "currently active observers" to decide what
      // refetches is a real race; force every matching query to refetch
      // regardless of its observed state at this exact instant. Also
      // invalidates accounts — deleting a movement changes at least one
      // account's live `balanceCents`, same reasoning as
      // components/movement-form.tsx's create/update mutations.
      queryClient.invalidateQueries({ queryKey: movementsQueryKey, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: accountsQueryKey, refetchType: 'all' });
      close();
    },
    onError: (error) => showApiError(error),
  });

  const confirmDelete = () => {
    if (!movement) return;
    confirmDestructive(
      'Eliminar movimiento',
      '¿Eliminar este movimiento? Esta acción no se puede deshacer.',
      () => deleteMutation.mutate(movement.id),
    );
  };

  const editMovement = () => {
    if (!movement) return;
    close();
    router.push({ pathname: '/select-category', params: { id: movement.id } });
  };

  return (
    <Modal visible={isOpen} animationType="none" transparent onRequestClose={close}>
      <Pressable className="flex-1 justify-end" onPress={close}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        />
        <View style={{ maxHeight: sheetMaxHeight }}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View className="rounded-t-lg border border-neutral-800 bg-neutral-900">
              <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-5">
                <Text className="text-2xl font-semibold text-neutral-50">
                  Detalle del movimiento
                </Text>
                <Pressable
                  onPress={close}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  hitSlop={8}
                >
                  <Ionicons name="close" size={28} color="#fafafa" />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 28 }}>
                {movement ? (
                  <MovementDetail
                    movement={movement}
                    categoryName={movement.categoryLabel}
                    accountName={
                      accounts?.find((account) => account.id === movement.accountId)?.name ??
                      'Cuenta desconocida'
                    }
                    toAccountName={
                      movement.toAccountId
                        ? (accounts?.find((account) => account.id === movement.toAccountId)?.name ??
                          'Cuenta desconocida')
                        : undefined
                    }
                    onEdit={editMovement}
                    onDelete={confirmDelete}
                    isDeleting={deleteMutation.isPending}
                  />
                ) : isLoadingMovements ? (
                  <ActivityIndicator color="#fbbf24" />
                ) : (
                  <Text className="text-neutral-500">No se encontró el movimiento.</Text>
                )}
              </ScrollView>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
