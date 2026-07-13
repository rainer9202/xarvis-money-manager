import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs, { type Dayjs } from 'dayjs';

import { Text } from '@/components/ui/Text';

type MonthPickerModalProps = {
  visible: boolean;
  value: Dayjs;
  onSelect: (month: Dayjs) => void;
  onClose: () => void;
};

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

/**
 * Standalone menu-triggered month/year picker for Home. Reuses the
 * Modal + dark-surface styling from AccountPickerModal for visual
 * consistency, but isn't a form field so it doesn't go through SelectField's
 * API. Year navigation is local to the modal (doesn't affect `value` until a
 * month cell is actually pressed) so browsing years doesn't change Home's
 * data until the user commits to a month.
 *
 * Slides up from the bottom on open and back down on close (one of two
 * exceptions to the app's no-animation rule for modals, along with
 * AccountPickerModal) — `animationType="none"` + a manually driven
 * `translateY` gives a plain slide without RN's own backdrop-pop.
 * `isRendered` keeps the Modal mounted for the duration of the closing
 * animation instead of unmounting the instant `visible` flips false.
 */
export function MonthPickerModal({ visible, value, onSelect, onClose }: MonthPickerModalProps) {
  const [displayedYear, setDisplayedYear] = useState(value.year());
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
    <Modal
      visible={isRendered}
      animationType="none"
      transparent
      onRequestClose={onClose}
      onShow={() => setDisplayedYear(value.year())}
    >
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
          <View className="rounded-t-lg border border-neutral-800 bg-neutral-900">
            <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-5">
              <Text className="text-2xl font-semibold text-neutral-50">Seleccionar mes</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
                <Ionicons name="close" size={28} color="#fafafa" />
              </Pressable>
            </View>

            <View className="px-4 py-6">
              <View className="mb-6 flex-row items-center justify-between">
                <Pressable
                  onPress={() => setDisplayedYear((year) => year - 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Año anterior"
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={24} color="#fafafa" />
                </Pressable>
                <Text className="text-lg font-semibold text-neutral-50">{displayedYear}</Text>
                <Pressable
                  onPress={() => setDisplayedYear((year) => year + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Año siguiente"
                  hitSlop={8}
                >
                  <Ionicons name="chevron-forward" size={24} color="#fafafa" />
                </Pressable>
              </View>

              <View className="flex-row flex-wrap justify-between">
                {MONTH_INDEXES.map((monthIndex) => {
                  const isSelected = displayedYear === value.year() && monthIndex === value.month();
                  return (
                    <Pressable
                      key={monthIndex}
                      className={
                        isSelected
                          ? 'mb-3 w-[31%] items-center rounded-xl bg-amber-400 py-4'
                          : 'mb-3 w-[31%] items-center rounded-xl bg-neutral-800 py-4 active:bg-neutral-700'
                      }
                      onPress={() => {
                        onSelect(dayjs().year(displayedYear).month(monthIndex).startOf('month'));
                        onClose();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={dayjs().month(monthIndex).format('MMMM')}
                    >
                      <Text className={isSelected ? 'text-base font-semibold text-neutral-950' : 'text-base font-medium text-neutral-200'}>
                        {dayjs().month(monthIndex).format('MMM')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
