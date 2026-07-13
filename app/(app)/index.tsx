import { ActivityIndicator, Pressable, RefreshControl, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { AccountPickerModal } from '@/components/account-picker-modal';
import { DayCalendarModal } from '@/components/day-calendar-modal';
import { MonthPickerModal } from '@/components/month-picker-modal';
import { MovementsSummaryHeader } from '@/components/movements-summary-header';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/error-state';
import { Text } from '@/components/ui/Text';
import { getMovementTypeColor, getMovementTypeIcon } from '@/lib/category-color';
import { formatCents } from '@/lib/format-money';
import { useAccountMonthMovements } from '@/lib/hooks/use-account-month-movements';
import type { Movement } from '@/lib/api/movements';
import { useMonthFilterStore } from '@/store/month-filter-store';
import { useMovementModalStore } from '@/store/movement-modal-store';

type DayGroup = {
  dateKey: string;
  dayLabel: string;
  weekdayLabel: string;
  netCents: number;
  movements: Movement[];
};

// `accountId` is the selected account — same reasoning as
// lib/hooks/use-account-month-movements.ts's `tallyExpenseIncome`: a
// transfer has no real expense/income meaning app-wide, but from this one
// account's point of view it still moves money in or out, so it's counted
// like an expense when this account is the source and like income when
// it's the destination. Otherwise a day with only a transfer on it showed
// a $0 total despite money actually having moved.
function groupByDay(movements: Movement[], accountId: string | null) {
  const groups: DayGroup[] = [];
  const indexByDate = new Map<string, number>();

  for (const movement of movements) {
    const dateKey = dayjs(movement.date).format('YYYY-MM-DD');
    let index = indexByDate.get(dateKey);
    if (index === undefined) {
      index = groups.length;
      indexByDate.set(dateKey, index);
      groups.push({
        dateKey,
        dayLabel: dayjs(movement.date).format('D MMM'),
        weekdayLabel: dayjs(movement.date).format('dddd'),
        netCents: 0,
        movements: [],
      });
    }
    const group = groups[index];
    group.movements.push(movement);
    if (movement.movementType === 'MT01') {
      group.netCents -= movement.amountCents;
    } else if (movement.movementType === 'MT02') {
      group.netCents += movement.amountCents;
    } else if (movement.movementType === 'MT03') {
      if (movement.accountId === accountId) group.netCents -= movement.amountCents;
      else if (movement.toAccountId === accountId) group.netCents += movement.amountCents;
    }
  }

  return groups;
}

export default function HomeScreen() {
  const router = useRouter();
  const openView = useMovementModalStore((state) => state.openView);
  const month = useMonthFilterStore((state) => state.month);
  const setMonth = useMonthFilterStore((state) => state.setMonth);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isDayCalendarOpen, setIsDayCalendarOpen] = useState(false);

  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    monthMovements,
    isLoading,
    isFetching,
    isError,
    refetch,
    expenseCents,
    incomeCents,
    balanceCents,
  } = useAccountMonthMovements(month);

  const selectedAccount = accounts?.find((account) => account.id === selectedAccountId);

  const sections = useMemo(
    () =>
      groupByDay(monthMovements, selectedAccountId).map((group) => ({
        title: group.dateKey,
        dayLabel: group.dayLabel,
        weekdayLabel: group.weekdayLabel,
        netCents: group.netCents,
        data: group.movements,
      })),
    [monthMovements, selectedAccountId],
  );

  // A transfer's sign/color depends on which leg touches the selected
  // account — same account-relative direction used by `groupByDay` and
  // `tallyExpenseIncome`, so a row's own +/- always matches how it was
  // counted in the day header total above it instead of always rendering
  // neutral/unsigned regardless of direction.
  const signedAmount = (movement: Movement) => {
    if (movement.movementType === 'MT01') return `-${formatCents(movement.amountCents)}`;
    if (movement.movementType === 'MT02') return formatCents(movement.amountCents);
    if (movement.accountId === selectedAccountId) return `-${formatCents(movement.amountCents)}`;
    return formatCents(movement.amountCents);
  };

  const amountColorClassName = (movement: Movement) => {
    if (movement.movementType === 'MT01') return 'text-red-500';
    if (movement.movementType === 'MT02') return 'text-emerald-500';
    if (movement.accountId === selectedAccountId) return 'text-red-500';
    if (movement.toAccountId === selectedAccountId) return 'text-emerald-500';
    return 'text-neutral-50';
  };

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

      {isLoading || (isFetching && !monthMovements.length) ? (
        <ActivityIndicator className="mt-4" color="#fbbf24" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 }}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor="#fbbf24" />
          }
          ListEmptyComponent={
            <View className="mt-4 items-center">
              <Text className="mb-4 text-lg text-neutral-500">No hay movimientos este mes.</Text>
              <Button size="sm" onPress={() => router.push('/select-category')}>
                Agregar movimiento
              </Button>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View className="mb-2 mt-4 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-neutral-200">
                {section.dayLabel} · {section.weekdayLabel}
              </Text>
              <Text className="text-base font-medium text-neutral-400">
                {section.netCents > 0 ? '+' : section.netCents < 0 ? '-' : ''}
                {formatCents(Math.abs(section.netCents))}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openView(item.id)}
              className="mb-2.5 flex-row items-center rounded-lg border border-card-border bg-card p-3.5 active:bg-card-raised"
              style={{ borderLeftWidth: 5, borderLeftColor: getMovementTypeColor(item.movementType) }}
            >
              <View
                className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: getMovementTypeColor(item.movementType) }}
              >
                <Ionicons name={getMovementTypeIcon(item.movementType)} size={20} color="#fafafa" />
              </View>
              <View className="mr-3 flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text numberOfLines={1} ellipsizeMode="tail" className="shrink text-base font-medium text-neutral-50">
                    {item.categoryLabel}
                  </Text>
                  {item.groupLabel ? (
                    <View className="shrink-0 rounded-full bg-card-raised px-1.5 py-0.5">
                      <Text className="text-xs font-medium text-neutral-300">{item.groupLabel}</Text>
                    </View>
                  ) : null}
                </View>
                {item.note ? (
                  <Text numberOfLines={1} ellipsizeMode="tail" className="mt-0.5 text-sm text-neutral-400">
                    {item.note}
                  </Text>
                ) : null}
              </View>
              <Text className={`shrink-0 text-base font-bold ${amountColorClassName(item)}`}>
                {signedAmount(item)}
              </Text>
            </Pressable>
          )}
        />
      )}

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
