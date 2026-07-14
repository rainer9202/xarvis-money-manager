import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AccountPickerModal } from '@/components/account-picker-modal';
import { DayCalendarModal } from '@/components/day-calendar-modal';
import { MonthPickerModal } from '@/components/month-picker-modal';
import { MovementsSummaryHeader } from '@/components/movements-summary-header';
import { PieChart } from 'react-native-gifted-charts';
import { ErrorState } from '@/components/ui/error-state';
import { Text } from '@/components/ui/Text';
import { getMovementAmountColorClassName } from '@/lib/category-color';
import { formatCents } from '@/lib/format-money';
import { useAccountMonthMovements } from '@/lib/hooks/use-account-month-movements';
import { buildBreakdown, type BreakdownDimension } from '@/lib/movement-breakdown';
import type { MovementType } from '@/lib/movement-type';
import { useMonthFilterStore } from '@/store/month-filter-store';

type BreakdownType = 'expense' | 'income';

// Internal keys stay 'expense'/'income' (English) — only the rendered
// label is Spanish; this maps each tab to the stable `movementType` code
// used for filtering (for-frontend.md §5.0).
const BREAKDOWN_MOVEMENT_TYPE: Record<BreakdownType, MovementType> = {
  expense: 'MT01',
  income: 'MT02',
};

const BREAKDOWN_TYPE_LABELS: Record<BreakdownType, string> = {
  expense: 'Gastos',
  income: 'Ingresos',
};

/**
 * Category/Group breakdown for the selected account + month — computed
 * client-side from the same `useAccountMonthMovements` data source Home
 * uses (there is no backend chart/aggregation endpoint), so this screen
 * shares Home's navbar/month-selector/balance header and respects the same
 * account filter. Kept deliberately simple per the reference layout: one
 * donut + a legend list, no drill-down, no multi-metric dashboard.
 */
export default function ChartsScreen() {
  const month = useMonthFilterStore((state) => state.month);
  const setMonth = useMonthFilterStore((state) => state.setMonth);
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('expense');
  const [dimension, setDimension] = useState<BreakdownDimension>('category');
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isDayCalendarOpen, setIsDayCalendarOpen] = useState(false);

  const movementType = BREAKDOWN_MOVEMENT_TYPE[breakdownType];
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    monthMovements,
    isLoading,
    isError,
    refetch,
    expenseCents,
    incomeCents,
    balanceCents,
  } = useAccountMonthMovements(month);

  const selectedAccount = accounts?.find((account) => account.id === selectedAccountId);

  const slices = useMemo(
    () =>
      buildBreakdown(
        monthMovements.filter((movement) => movement.movementType === movementType),
        dimension,
      ),
    [monthMovements, movementType, dimension],
  );

  const totalCents = slices.reduce((sum, slice) => sum + slice.amountCents, 0);

  return (
    <View className="flex-1 bg-background">
      <MovementsSummaryHeader
        month={month}
        expenseCents={expenseCents}
        incomeCents={incomeCents}
        balanceCents={balanceCents}
        selectedAccount={selectedAccount}
        onOpenAccountPicker={() => setIsAccountPickerOpen(true)}
        onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
        onPressCalendar={() => setIsDayCalendarOpen(true)}
      />

      <View className="flex-1 px-4 pt-4">
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-14 flex-1 flex-row rounded-2xl border border-neutral-800 bg-neutral-900 p-1">
            {(['expense', 'income'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setBreakdownType(type)}
                className={
                  breakdownType === type
                    ? 'flex-1 items-center justify-center rounded-xl bg-amber-400 py-2.5'
                    : 'flex-1 items-center justify-center rounded-xl py-2.5'
                }
              >
                <Text
                  className={
                    breakdownType === type
                      ? 'text-base font-semibold text-neutral-950'
                      : 'text-base font-medium text-neutral-400'
                  }
                >
                  {BREAKDOWN_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Same compact icon+label affordance as the month selector in
           * MovementsSummaryHeader — only two states, so a single tap
           * toggles instead of opening a picker. Explicit h-14 matches the
           * expense/income segmented control's height (also h-14) so
           * neither one dictates the row's height by its own content. */}
          <Pressable
            onPress={() =>
              setDimension((current) => (current === 'category' ? 'group' : 'category'))
            }
            accessibilityRole="button"
            accessibilityLabel="Alternar entre categoría o grupo"
            className="h-14 flex-row items-center gap-1.5 rounded-2xl border border-neutral-800 bg-neutral-900 px-4"
          >
            <Ionicons
              name={dimension === 'category' ? 'pricetag-outline' : 'albums-outline'}
              size={16}
              color="#fbbf24"
            />
            <Text className="text-base font-semibold text-neutral-50">
              {dimension === 'category' ? 'Categoría' : 'Grupo'}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator className="mt-4" color="#fbbf24" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={slices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListHeaderComponent={
              slices.length ? (
                <View className="mb-6 items-center py-4">
                  <PieChart
                    donut
                    data={slices}
                    radius={100}
                    innerRadius={64}
                    innerCircleColor="#0a0a0a"
                    centerLabelComponent={() => (
                      <View className="items-center">
                        <Text className="text-sm font-medium text-neutral-400">Total</Text>
                        <Text
                          className={`text-lg font-semibold ${getMovementAmountColorClassName(movementType)}`}
                        >
                          {movementType === 'MT01' ? '-' : ''}
                          {formatCents(totalCents)}
                        </Text>
                      </View>
                    )}
                  />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text className="text-lg text-neutral-500">
                Sin movimientos de {BREAKDOWN_TYPE_LABELS[breakdownType].toLowerCase()} este mes.
              </Text>
            }
            renderItem={({ item }) => (
              <View className="mb-1.5 flex-row items-center justify-between border-b border-neutral-800 py-4">
                <View className="flex-row items-center gap-2.5">
                  <View className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <Text className="text-lg text-neutral-200">{item.label}</Text>
                  <Text className="text-sm text-neutral-500">({item.percent}%)</Text>
                </View>
                <Text
                  className={`text-lg font-semibold ${getMovementAmountColorClassName(movementType)}`}
                >
                  {movementType === 'MT01' ? '-' : ''}
                  {formatCents(item.amountCents)}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      <AccountPickerModal
        visible={isAccountPickerOpen}
        accounts={accounts ?? []}
        selectedAccountId={selectedAccountId}
        onSelect={setSelectedAccountId}
        onClose={() => setIsAccountPickerOpen(false)}
      />

      <MonthPickerModal
        visible={isMonthPickerOpen}
        value={month}
        onSelect={setMonth}
        onClose={() => setIsMonthPickerOpen(false)}
      />

      <DayCalendarModal
        visible={isDayCalendarOpen}
        month={month}
        movements={monthMovements}
        onClose={() => setIsDayCalendarOpen(false)}
      />
    </View>
  );
}
