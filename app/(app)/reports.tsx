import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';

import { AccountPickerModal } from '@/components/account-picker-modal';
import { MovementsSummaryHeader } from '@/components/movements-summary-header';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/error-state';
import { Text } from '@/components/ui/Text';
import { getBalanceReport } from '@/lib/api/reports';
import type { Movement } from '@/lib/api/movements';
import { formatCents } from '@/lib/format-money';
import { filterByMonth, tallyExpenseIncome, useAccountMovements } from '@/lib/hooks/use-account-month-movements';
import { buildBreakdown, type BreakdownSlice } from '@/lib/movement-breakdown';
import { useMonthFilterStore } from '@/store/month-filter-store';

type MonthTotals = { expenseCents: number; incomeCents: number; balanceCents: number };

export function tallyMonth(movements: Movement[], month: Dayjs, accountId: string | null): MonthTotals {
  return tallyExpenseIncome(filterByMonth(movements, month), accountId);
}

/** `null` when there's no previous-period value to compare against (avoids
 * a divide-by-zero reading as a meaningless ±∞%). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const TREND_MONTHS = 6;

type CategoryChange = {
  id: string;
  label: string;
  color: string;
  currentCents: number;
  previousCents: number;
  deltaCents: number;
};

/** Merges two months' category breakdowns into per-category deltas, sorted
 * by the size of the change (increase or decrease) — a category with no
 * movements in one of the two months still shows up (as a 100% swing). */
export function buildCategoryChanges(current: BreakdownSlice[], previous: BreakdownSlice[], limit: number): CategoryChange[] {
  const byId = new Map<string, CategoryChange>();
  for (const slice of current) {
    byId.set(slice.id, {
      id: slice.id,
      label: slice.label,
      color: slice.color,
      currentCents: slice.amountCents,
      previousCents: 0,
      deltaCents: slice.amountCents,
    });
  }
  for (const slice of previous) {
    const existing = byId.get(slice.id);
    if (existing) {
      existing.previousCents = slice.amountCents;
      existing.deltaCents = existing.currentCents - slice.amountCents;
    } else {
      byId.set(slice.id, {
        id: slice.id,
        label: slice.label,
        color: slice.color,
        currentCents: 0,
        previousCents: slice.amountCents,
        deltaCents: -slice.amountCents,
      });
    }
  }
  return Array.from(byId.values())
    .filter((entry) => entry.deltaCents !== 0)
    .sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents))
    .slice(0, limit);
}

/**
 * Reports — per-account live balances (`getBalanceReport`, all-time) plus a
 * set of month-scoped stats derived from `useAccountMovements`
 * (`historic: true` — the one screen that still needs full history, since
 * the 6-month trend and month-over-month deltas span more than one month at
 * once; Home/Charts fetch one `month` at a time instead, see
 * lib/hooks/use-account-month-movements.ts): savings rate, month-over-month
 * change, a 6-month trend, and top categories/groups. Everything below the
 * header is computed client-side — there is no backend aggregation endpoint
 * for any of this.
 */
export default function ReportsScreen() {
  const month = useMonthFilterStore((state) => state.month);
  const setMonth = useMonthFilterStore((state) => state.setMonth);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);

  const { accounts, selectedAccountId, setSelectedAccountId, accountMovements, isLoading, isError, refetch } =
    useAccountMovements();

  const currentTotals = useMemo(
    () => tallyMonth(accountMovements, month, selectedAccountId),
    [accountMovements, month, selectedAccountId],
  );
  const previousTotals = useMemo(
    () => tallyMonth(accountMovements, month.subtract(1, 'month'), selectedAccountId),
    [accountMovements, month, selectedAccountId],
  );

  const savingsRate =
    currentTotals.incomeCents > 0 ? Math.round((currentTotals.balanceCents / currentTotals.incomeCents) * 100) : null;
  const expenseChange = percentChange(currentTotals.expenseCents, previousTotals.expenseCents);
  const incomeChange = percentChange(currentTotals.incomeCents, previousTotals.incomeCents);

  const trend = useMemo(() => {
    return Array.from({ length: TREND_MONTHS }, (_, index) => {
      const trendMonth = month.subtract(TREND_MONTHS - 1 - index, 'month');
      return { label: trendMonth.format('MMM'), ...tallyMonth(accountMovements, trendMonth, selectedAccountId) };
    });
  }, [accountMovements, month, selectedAccountId]);
  const trendMax = Math.max(1, ...trend.flatMap((entry) => [entry.expenseCents, entry.incomeCents]));

  const currentMonthMovements = useMemo(
    () => accountMovements.filter((movement) => dayjs(movement.date).isSame(month, 'month') && movement.movementType === 'MT01'),
    [accountMovements, month],
  );
  const previousMonthMovements = useMemo(
    () =>
      accountMovements.filter(
        (movement) => dayjs(movement.date).isSame(month.subtract(1, 'month'), 'month') && movement.movementType === 'MT01',
      ),
    [accountMovements, month],
  );
  const topCategories = useMemo(() => buildBreakdown(currentMonthMovements, 'category', 5), [currentMonthMovements]);
  const topGroups = useMemo(() => buildBreakdown(currentMonthMovements, 'group', 5), [currentMonthMovements]);
  const categoryChanges = useMemo(
    () =>
      buildCategoryChanges(
        buildBreakdown(currentMonthMovements, 'category'),
        buildBreakdown(previousMonthMovements, 'category'),
        5,
      ),
    [currentMonthMovements, previousMonthMovements],
  );
  const expenseCount = currentMonthMovements.length;
  const avgExpenseCents = expenseCount > 0 ? Math.round(currentTotals.expenseCents / expenseCount) : 0;

  const {
    data: balanceReport,
    isLoading: isBalanceReportLoading,
    isError: isBalanceReportError,
    refetch: refetchBalanceReport,
  } = useQuery({
    queryKey: ['reports', 'balance'],
    queryFn: getBalanceReport,
    // Derived from live account balances, which only change via movement
    // mutations — those already invalidate this key immediately, so this
    // just avoids a redundant background refetch on remount.
    staleTime: 60 * 1000,
  });

  return (
    <View className="flex-1 bg-background">
      <MovementsSummaryHeader
        month={month}
        showStats={false}
        onSelectMonth={setMonth}
        onOpenAccountPicker={() => setIsAccountPickerOpen(true)}
        onPressCalendar={() => setMonth(dayjs().startOf('month'))}
      />

      {isLoading ? (
        <ActivityIndicator className="mt-4" color="#fbbf24" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}>
          <Card padding={20} className="mb-4">
            <View className="mb-4 flex-row items-start justify-between">
              <View>
                <Text className="text-base font-medium text-neutral-400">Cuentas</Text>
                <Text className="mt-0.5 text-sm text-neutral-500">Saldo actual de cada cuenta</Text>
              </View>
              <Text className="text-base font-medium text-neutral-500">Histórico</Text>
            </View>
            {isBalanceReportLoading ? (
              <ActivityIndicator color="#fbbf24" />
            ) : isBalanceReportError ? (
              <ErrorState message="No pudimos cargar los saldos." onRetry={() => void refetchBalanceReport()} />
            ) : (balanceReport?.accounts ?? []).length === 0 ? (
              <Text className="text-lg text-neutral-500">Todavía no tienes cuentas.</Text>
            ) : (
              <>
                {balanceReport?.accounts.map((item) => (
                  <View key={item.id} className="mb-3 flex-row items-center justify-between">
                    <Text className="text-lg text-neutral-200">{item.name}</Text>
                    <Text
                      className={
                        item.balanceCents < 0
                          ? 'text-lg font-semibold text-red-500'
                          : 'text-lg font-semibold text-emerald-500'
                      }
                    >
                      {formatCents(item.balanceCents)}
                    </Text>
                  </View>
                ))}
                {balanceReport ? (
                  <View className="mt-4 flex-row items-center justify-between border-t border-neutral-800 pt-4">
                    <Text className="text-lg font-semibold text-neutral-50">Balance total</Text>
                    <Text
                      className={
                        balanceReport.totalBalanceCents < 0
                          ? 'text-xl font-semibold text-red-500'
                          : 'text-xl font-semibold text-emerald-500'
                      }
                    >
                      {formatCents(balanceReport.totalBalanceCents)}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </Card>

          <View className="mb-4 flex-row gap-4">
            <Card padding={20} className="flex-1 items-center">
              <Text className="text-base font-medium text-neutral-400">Tasa de ahorro</Text>
              <Text
                className={
                  savingsRate === null
                    ? 'mt-1.5 text-3xl font-bold text-neutral-500'
                    : savingsRate >= 0
                      ? 'mt-1.5 text-3xl font-bold text-emerald-500'
                      : 'mt-1.5 text-3xl font-bold text-red-500'
                }
              >
                {savingsRate === null ? '—' : `${savingsRate}%`}
              </Text>
              <Text className="mt-1.5 text-sm text-neutral-500">del ingreso ahorrado</Text>
            </Card>

            <Card padding={20} className="flex-1">
              <Text className="mb-3 text-base font-medium text-neutral-400">vs. mes anterior</Text>
              <ChangeRow label="Gastos" change={expenseChange} goodDirection="down" />
              <ChangeRow label="Ingresos" change={incomeChange} goodDirection="up" />
            </Card>
          </View>

          <View className="mb-4 flex-row gap-4">
            <Card padding={20} className="flex-1 items-center">
              <Text className="text-base font-medium text-neutral-400">Transacciones</Text>
              <Text className="mt-1.5 text-3xl font-bold text-neutral-50">{expenseCount}</Text>
              <Text className="mt-1.5 text-sm text-neutral-500">gastos este mes</Text>
            </Card>

            <Card padding={20} className="flex-1 items-center">
              <Text className="text-base font-medium text-neutral-400">Gasto promedio</Text>
              <Text className="mt-1.5 text-3xl font-bold text-neutral-50">{formatCents(avgExpenseCents)}</Text>
              <Text className="mt-1.5 text-sm text-neutral-500">por transacción</Text>
            </Card>
          </View>

          <Card padding={20} className="mb-4">
            <Text className="text-base font-medium text-neutral-400">Últimos {TREND_MONTHS} meses</Text>
            <Text className="mb-4 mt-0.5 text-sm text-neutral-500">Gastos e ingresos mes a mes</Text>
            <View className="flex-row items-end justify-between" style={{ height: 96 }}>
              {trend.map((entry) => (
                <View key={entry.label} className="items-center" style={{ width: `${100 / TREND_MONTHS}%` }}>
                  <View className="flex-row items-end gap-1" style={{ height: 72 }}>
                    <View
                      className="w-2 rounded-t-sm bg-red-500"
                      style={{ height: Math.max(2, (entry.expenseCents / trendMax) * 72) }}
                    />
                    <View
                      className="w-2 rounded-t-sm bg-emerald-500"
                      style={{ height: Math.max(2, (entry.incomeCents / trendMax) * 72) }}
                    />
                  </View>
                  <Text className="mt-2 text-sm font-medium text-neutral-500">{entry.label}</Text>
                </View>
              ))}
            </View>
            <View className="mt-4 flex-row justify-center gap-5">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-red-500" />
                <Text className="text-sm text-neutral-500">Gastos</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-emerald-500" />
                <Text className="text-sm text-neutral-500">Ingresos</Text>
              </View>
            </View>
          </Card>

          <BreakdownCard
            title="Categorías con más gasto"
            subtitle="Top 5 categorías del mes"
            slices={topCategories}
          />
          <BreakdownCard title="Grupos con más gasto" subtitle="Top 5 grupos del mes" slices={topGroups} />

          <Card padding={20}>
            <Text className="text-base font-medium text-neutral-400">Cambios por categoría vs. mes anterior</Text>
            <Text className="mb-4 mt-0.5 text-sm text-neutral-500">Categorías con mayor variación</Text>
            {categoryChanges.length === 0 ? (
              <Text className="text-lg text-neutral-500">Sin cambios respecto al mes anterior.</Text>
            ) : (
              categoryChanges.map((change) => {
                const isIncrease = change.deltaCents > 0;
                const percent =
                  change.previousCents > 0 ? Math.round((change.deltaCents / change.previousCents) * 100) : null;
                return (
                  <View key={change.id} className="mb-3 flex-row items-center justify-between">
                    <View className="mr-2 flex-1 flex-row items-center gap-2.5">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: change.color }} />
                      <Text numberOfLines={1} className="flex-1 text-lg text-neutral-200">
                        {change.label}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons
                        name={isIncrease ? 'arrow-up' : 'arrow-down'}
                        size={13}
                        color={isIncrease ? '#ef4444' : '#10b981'}
                      />
                      <Text
                        className={
                          isIncrease
                            ? 'text-lg font-semibold text-red-500'
                            : 'text-lg font-semibold text-emerald-500'
                        }
                      >
                        {percent !== null ? `${Math.abs(percent)}%` : formatCents(Math.abs(change.deltaCents))}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </ScrollView>
      )}

      <AccountPickerModal
        visible={isAccountPickerOpen}
        accounts={accounts ?? []}
        selectedAccountId={selectedAccountId}
        onSelect={setSelectedAccountId}
        onClose={() => setIsAccountPickerOpen(false)}
      />
    </View>
  );
}

type ChangeRowProps = {
  label: string;
  change: number | null;
  /** Which direction reads as "good" for this metric — down for Expenses
   * (spent less), up for Income (earned more) — so the arrow color means
   * the same thing ("this is going well") for both rows even though the
   * numeric sign logic differs. */
  goodDirection: 'up' | 'down';
};

function ChangeRow({ label, change, goodDirection }: ChangeRowProps) {
  if (change === null) {
    return (
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-lg text-neutral-300">{label}</Text>
        <Text className="text-lg text-neutral-500">—</Text>
      </View>
    );
  }

  const isUp = change > 0;
  const isGood = change === 0 || (isUp && goodDirection === 'up') || (!isUp && goodDirection === 'down');
  const colorClassName = isGood ? 'text-emerald-500' : 'text-red-500';

  return (
    <View className="mb-1.5 flex-row items-center justify-between">
      <Text className="text-lg text-neutral-300">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={13} color={isGood ? '#10b981' : '#ef4444'} />
        <Text className={`text-lg font-semibold ${colorClassName}`}>{Math.abs(change)}%</Text>
      </View>
    </View>
  );
}

function BreakdownCard({
  title,
  subtitle,
  slices,
}: {
  title: string;
  subtitle: string;
  slices: ReturnType<typeof buildBreakdown>;
}) {
  return (
    <Card padding={20} className="mb-4">
      <Text className="text-base font-medium text-neutral-400">{title}</Text>
      <Text className="mb-4 mt-0.5 text-sm text-neutral-500">{subtitle}</Text>
      {slices.length === 0 ? (
        <Text className="text-lg text-neutral-500">Sin gastos este mes.</Text>
      ) : (
        slices.map((slice) => (
          <View key={slice.id} className="mb-3 flex-row items-center justify-between">
            <View className="mr-2 flex-1 flex-row items-center gap-2.5">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <Text numberOfLines={1} className="flex-1 text-lg text-neutral-200">
                {slice.label}
              </Text>
              <Text className="text-base text-neutral-500">{slice.percent}%</Text>
            </View>
            <Text className="text-lg font-semibold text-red-500">-{formatCents(slice.amountCents)}</Text>
          </View>
        ))
      )}
    </Card>
  );
}
