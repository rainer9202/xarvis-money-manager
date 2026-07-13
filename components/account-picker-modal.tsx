import { useEffect, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import type { Account } from '@/lib/api/accounts';
import { getAccountTypeColor, getAccountTypeIcon } from '@/lib/account-color';

type AccountPickerModalProps = {
  visible: boolean;
  accounts: Account[];
  selectedAccountId: string | null;
  onSelect: (accountId: string) => void;
  onClose: () => void;
};

/**
 * Standalone menu-triggered account picker for Home's navbar. Reuses the
 * Modal + FlatList technique from components/ui/select-field.tsx for visual
 * consistency, but isn't a form field (no label/error slot) so it doesn't go
 * through SelectField's API.
 *
 * Slides up from the bottom on open and back down on close (one of two
 * exceptions to the app's no-animation rule for modals, along with
 * MonthPickerModal) — `animationType="none"` + a manually driven
 * `translateY` gives a plain slide without RN's own backdrop-pop.
 * `isRendered` keeps the Modal mounted for the duration of the closing
 * animation instead of unmounting the instant `visible` flips false.
 */
export function AccountPickerModal({ visible, accounts, selectedAccountId, onSelect, onClose }: AccountPickerModalProps) {
  const [isRendered, setIsRendered] = useState(visible);
  const [sheetTranslateY] = useState(() => new Animated.Value(300));

  if (visible && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(300);
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      return;
    }
    if (!isRendered) return;
    Animated.timing(sheetTranslateY, { toValue: 300, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setIsRendered(false);
    });
  }, [visible, isRendered, sheetTranslateY]);

  return (
    <Modal visible={isRendered} animationType="none" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" onPress={onClose}>
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
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <View className="max-h-[30rem] rounded-t-lg border border-neutral-800 bg-neutral-900">
            <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-5">
              <Text className="text-2xl font-semibold text-neutral-50">Seleccionar cuenta</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
                <Ionicons name="close" size={28} color="#fafafa" />
              </Pressable>
            </View>
            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
              ListEmptyComponent={<Text className="py-4 text-neutral-500">Todavía no tienes cuentas.</Text>}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedAccountId;
                return (
                  <Pressable
                    className="flex-row items-center border-b border-neutral-800 py-4 active:bg-neutral-800"
                    onPress={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                  >
                    <View
                      className="mr-4 h-11 w-11 items-center justify-center rounded-full"
                      style={{ backgroundColor: getAccountTypeColor(item.type) }}
                    >
                      <Ionicons name={getAccountTypeIcon(item.type)} size={20} color="#fafafa" />
                    </View>
                    <View className="flex-1">
                      <Text className={isSelected ? 'text-lg font-semibold text-amber-400' : 'text-lg text-neutral-50'}>
                        {item.name}
                      </Text>
                      <Text className="mt-0.5 text-sm text-neutral-400">{item.typeLabel}</Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark" size={22} color="#fbbf24" /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
