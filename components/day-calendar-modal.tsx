import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs, { type Dayjs } from 'dayjs';

import { Text } from '@/components/ui/Text';
import type { Movement } from '@/lib/api/movements';
import { getMovementTypeColor } from '@/lib/category-color';
import type { MovementType } from '@/lib/movement-type';

type DayCalendarModalProps = {
  visible: boolean;
  /** The month currently shown on the caller's screen — this modal is a
   * read-only overview of it, not a separate month browser. */
  month: Dayjs;
  /** Already scoped to `month` by the caller — this component only
   * aggregates by day, it doesn't filter by month itself. */
  movements: Movement[];
  onClose: () => void;
};

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type DayCell = {
  day: number;
  dateKey: string;
  types: MovementType[];
};

/**
 * Read-only calendar view of the selected month, behind the navbar calendar
 * button shared by Home, Charts, and Reports (components/movements-summary-
 * header.tsx's `onPressCalendar`) — shows every day of the month with a
 * colored dot per movement type present that day (red=Gasto, green=Ingreso,
 * blue=Transferencia), so "what happened this month" is visible at a
 * glance. Deliberately non-interactive per product decision — days aren't
 * pressable, this is an overview, not a day picker.
 *
 * Slides up from the bottom on open and back down on close, matching
 * MonthPickerModal/AccountPickerModal — `animationType="none"` + a manually
 * driven `translateY`. `isRendered` keeps the Modal mounted for the
 * duration of the closing animation instead of unmounting the instant
 * `visible` flips false.
 */
export function DayCalendarModal({ visible, month, movements, onClose }: DayCalendarModalProps) {
  const [isRendered, setIsRendered] = useState(visible);
  const [sheetTranslateY] = useState(() => new Animated.Value(300));

  if (visible && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(300);
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!isRendered) return;
    Animated.timing(sheetTranslateY, { toValue: 300, duration: 200, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setIsRendered(false);
      },
    );
  }, [visible, isRendered, sheetTranslateY]);

  const cells = useMemo(() => {
    const typesByDay = new Map<number, Set<MovementType>>();
    for (const movement of movements) {
      const day = dayjs(movement.date).date();
      const set = typesByDay.get(day) ?? new Set<MovementType>();
      set.add(movement.movementType);
      typesByDay.set(day, set);
    }

    const daysInMonth = month.daysInMonth();
    const leadingBlanks = month.startOf('month').day();
    const days: DayCell[] = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        day,
        dateKey: month.date(day).format('YYYY-MM-DD'),
        types: Array.from(typesByDay.get(day) ?? []),
      };
    });

    return { leadingBlanks, days };
  }, [month, movements]);

  const todayKey = dayjs().format('YYYY-MM-DD');

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
          <View className="rounded-t-lg border border-neutral-800 bg-neutral-900">
            <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-5">
              <Text className="text-2xl font-semibold text-neutral-50">
                {month.format('MMMM YYYY')}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={28} color="#fafafa" />
              </Pressable>
            </View>

            <View className="px-4 py-6">
              <View className="mb-3 flex-row">
                {WEEKDAY_LABELS.map((label) => (
                  <View key={label} className="flex-1 items-center">
                    <Text className="text-xs font-semibold uppercase text-neutral-500">
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {Array.from({ length: cells.leadingBlanks }, (_, index) => (
                  <View
                    key={`blank-${index}`}
                    style={{ width: `${100 / 7}%` }}
                    className="mb-2 h-14 items-center"
                  />
                ))}
                {cells.days.map((cell) => {
                  const isToday = cell.dateKey === todayKey;
                  return (
                    <View
                      key={cell.dateKey}
                      style={{ width: `${100 / 7}%` }}
                      className="mb-2 h-14 items-center"
                    >
                      <View
                        className="h-11 w-11 items-center justify-center rounded-full"
                        style={isToday ? { borderWidth: 2, borderColor: '#fbbf24' } : undefined}
                      >
                        <Text
                          className={
                            isToday
                              ? 'text-base font-bold text-amber-400'
                              : 'text-base font-medium text-neutral-200'
                          }
                        >
                          {cell.day}
                        </Text>
                        <View className="mt-0.5 flex-row gap-0.5">
                          {cell.types.map((type) => (
                            <View
                              key={type}
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: getMovementTypeColor(type) }}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View className="mt-4 flex-row justify-center gap-5">
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getMovementTypeColor('MT01') }}
                  />
                  <Text className="text-xs text-neutral-500">Gastos</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getMovementTypeColor('MT02') }}
                  />
                  <Text className="text-xs text-neutral-500">Ingresos</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getMovementTypeColor('MT03') }}
                  />
                  <Text className="text-xs text-neutral-500">Transferencias</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
