import { Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useConfirmModalStore } from '@/store/confirm-modal-store';

/**
 * App-wide destructive-action confirmation dialog — replaces the old
 * `window.confirm` (web) / `Alert.alert` (native) split in lib/confirm.ts
 * with one custom-styled dialog that matches the rest of the app (dark
 * theme, amber accent). Mounted once at the root layout, opened
 * imperatively via `confirmDestructive(title, message, onConfirm)` — call
 * sites are unchanged.
 *
 * Centered, not a bottom sheet like the app's picker modals — a confirm
 * dialog is reached right after tapping a "Delete" button, often itself
 * near the bottom of the screen; anchoring the dialog to the bottom too
 * would put its own Delete button in roughly the same spot, risking an
 * accidental double-tap. Centering forces a deliberate re-aim.
 *
 * No entrance/exit animation, appears and disappears instantly (product
 * decision).
 *
 * This is the native implementation (iOS/Android) — RN's real `Modal`
 * stacks correctly on top of other presented modals via the OS's own window
 * stack, no extra work needed here. See confirm-modal.web.tsx for why web
 * needs a completely different approach (Metro picks that file automatically
 * for web builds).
 */
export function ConfirmModal() {
  const isOpen = useConfirmModalStore((state) => state.isOpen);
  const title = useConfirmModalStore((state) => state.title);
  const message = useConfirmModalStore((state) => state.message);
  const onConfirm = useConfirmModalStore((state) => state.onConfirm);
  const close = useConfirmModalStore((state) => state.close);

  const confirm = () => {
    onConfirm?.();
    close();
  };

  return (
    <Modal visible={isOpen} animationType="none" transparent onRequestClose={close}>
      <Pressable className="flex-1 items-center justify-center px-4" onPress={close}>
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
        <View style={{ width: '100%' }}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View className="rounded-lg border border-neutral-800 bg-neutral-900 p-8">
              <Text className="mb-3 text-2xl font-semibold text-neutral-50">{title}</Text>
              <Text className="mb-8 text-base text-neutral-400">{message}</Text>
              <View className="flex-row gap-4">
                <Button className="flex-1" variant="secondary" onPress={close}>
                  Cancelar
                </Button>
                <Button className="flex-1" variant="destructive" onPress={confirm}>
                  Eliminar
                </Button>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
