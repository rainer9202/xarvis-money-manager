import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PieChart } from 'react-native-gifted-charts';

import { AccountPickerModal } from '@/components/account-picker-modal';
import { DayCalendarModal } from '@/components/day-calendar-modal';
import { MovementsSummaryHeader } from '@/components/movements-summary-header';
import { BreakdownCard, ChangeRow } from '@/components/report-cards';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/error-state';
import { Text } from '@/components/ui/Text';
import { getBalanceReport } from '@/lib/api/reports';
import { formatCents } from '@/lib/format-money';
import { filterByMonth, useAccountMovements } from '@/lib/hooks/use-account-month-movements';
import { useGroups } from '@/lib/hooks/use-groups';
import { useMovements } from '@/lib/hooks/use-movements';
import { buildBreakdown } from '@/lib/movement-breakdown';
import {
  computeAccountBalanceSlices,
  computeGroupBudgets,
  computeMonthlyAccountBalances,
  computeSavedCents,
  computeSavingsRate,
  percentChange,
  tallyMonth,
} from '@/lib/reports';
import { useMonthFilterStore } from '@/store/month-filter-store';

const TREND_MONTHS = 6;

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
type ReportsView = 'general' | 'month';

export default function ReportsScreen() {
  const month = useMonthFilterStore((state) => state.month);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isDayCalendarOpen, setIsDayCalendarOpen] = useState(false);
  const [view, setView] = useState<ReportsView>('month');

  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    accountMovements,
    isLoading,
    isError,
    refetch,
  } = useAccountMovements();

  const currentTotals = useMemo(
    () => tallyMonth(accountMovements, month, selectedAccountId),
    [accountMovements, month, selectedAccountId],
  );
  const previousTotals = useMemo(
    () => tallyMonth(accountMovements, month.subtract(1, 'month'), selectedAccountId),
    [accountMovements, month, selectedAccountId],
  );

  // Portfolio-wide, unlike everything else on this screen — see
  // `computeSavingsRate`'s doc comment for why. A separate, cheap
  // (single-month, not `historic: true`) query since `accountMovements`
  // above is scoped to just the selected account.
  const { data: allAccountsMonthMovements } = useMovements({ month: month.format('YYYY-MM') });
  const savingsRate = useMemo(
    () => computeSavingsRate(allAccountsMonthMovements ?? [], accounts ?? []),
    [allAccountsMonthMovements, accounts],
  );
  const { data: groups } = useGroups();
  const groupBudgets = useMemo(
    () => computeGroupBudgets(allAccountsMonthMovements ?? [], groups ?? []),
    [allAccountsMonthMovements, groups],
  );
  const monthlyBalanceReport = useMemo(
    () => computeMonthlyAccountBalances(allAccountsMonthMovements ?? [], accounts ?? []),
    [allAccountsMonthMovements, accounts],
  );
  const expenseChange = percentChange(currentTotals.expenseCents, previousTotals.expenseCents);
  const incomeChange = percentChange(currentTotals.incomeCents, previousTotals.incomeCents);

  // Portfolio-wide, same reasoning as `allAccountsMonthMovements` above —
  // the trend's "Ahorro" bar needs every account's transfers into savings,
  // and needs the full TREND_MONTHS span rather than just the selected
  // month, so it's its own historic query.
  const { data: allAccountsAllTimeMovements } = useMovements({ historic: true });
  const trend = useMemo(() => {
    return Array.from({ length: TREND_MONTHS }, (_, index) => {
      const trendMonth = month.subtract(TREND_MONTHS - 1 - index, 'month');
      return {
        label: trendMonth.format('MMM'),
        ...tallyMonth(accountMovements, trendMonth, selectedAccountId),
        savedCents: computeSavedCents(
          filterByMonth(allAccountsAllTimeMovements ?? [], trendMonth),
          accounts ?? [],
        ),
      };
    });
  }, [accountMovements, month, selectedAccountId, allAccountsAllTimeMovements, accounts]);
  const trendMax = Math.max(
    1,
    ...trend.flatMap((entry) => [entry.expenseCents, entry.incomeCents, entry.savedCents]),
  );

  // Every movement type, unlike `currentMonthMovements` below (MT01-only) —
  // DayCalendarModal shows a colored dot per type present each day.
  const currentMonthAllMovements = useMemo(
    () => filterByMonth(accountMovements, month),
    [accountMovements, month],
  );
  const currentMonthMovements = useMemo(
    () => currentMonthAllMovements.filter((movement) => movement.movementType === 'MT01'),
    [currentMonthAllMovements],
  );
  const topCategories = useMemo(
    () => buildBreakdown(currentMonthMovements, 'category', 5),
    [currentMonthMovements],
  );
  const topGroups = useMemo(
    () => buildBreakdown(currentMonthMovements, 'group', 5),
    [currentMonthMovements],
  );
  const expenseCount = currentMonthMovements.length;

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
  const accountBalanceSlices = useMemo(
    () => computeAccountBalanceSlices(balanceReport?.accounts ?? [], accounts ?? []),
    [balanceReport, accounts],
  );

  return (
    <View className="flex-1 bg-background">
      <MovementsSummaryHeader
        month={month}
        showStats={false}
        onOpenAccountPicker={() => setIsAccountPickerOpen(true)}
        onPressCalendar={() => setIsDayCalendarOpen(true)}
      />

      <View className="px-4 pt-4">
        <View className="h-14 flex-row rounded-2xl border border-neutral-800 bg-neutral-900 p-1">
          {(['general', 'month'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setView(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === option }}
              className={
                view === option
                  ? 'flex-1 items-center justify-center rounded-xl bg-amber-400 py-2.5'
                  : 'flex-1 items-center justify-center rounded-xl py-2.5'
              }
            >
              <Text
                className={
                  view === option
                    ? 'text-base font-semibold text-neutral-950'
                    : 'text-base font-medium text-neutral-400'
                }
              >
                {option === 'general' ? 'General' : 'Este mes'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-4" color="#fbbf24" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
        >
          {view === 'general' ? (
            <>
              <Card
                padding={20}
                className="mb-4"
                style={{ borderLeftWidth: 3, borderLeftColor: '#a78bfa' }}
              >
                <View className="mb-4 flex-row items-start justify-between">
                  <View>
                    <Text className="text-base font-medium text-neutral-400">Cuentas</Text>
                    <Text className="mt-0.5 text-sm text-neutral-500">
                      Saldo actual de cada cuenta
                    </Text>
                  </View>
                  <Text className="rounded-full bg-violet-400/15 px-2.5 py-1 text-xs font-semibold text-violet-400">
                    Histórico
                  </Text>
                </View>
                {isBalanceReportLoading ? (
                  <ActivityIndicator color="#fbbf24" />
                ) : isBalanceReportError ? (
                  <ErrorState
                    message="No pudimos cargar los saldos."
                    onRetry={() => void refetchBalanceReport()}
                  />
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

              {accountBalanceSlices.length > 0 ? (
                <Card padding={20} className="mb-4 items-center">
                  <Text className="mb-4 self-start text-base font-medium text-neutral-400">
                    Distribución del balance
                  </Text>
                  <PieChart
                    donut
                    data={accountBalanceSlices}
                    radius={90}
                    innerRadius={56}
                    innerCircleColor="#0a0a0a"
                    centerLabelComponent={() => (
                      <View className="items-center">
                        <Text className="text-sm font-medium text-neutral-400">Total</Text>
                        <Text className="text-lg font-semibold text-neutral-50">
                          {formatCents(
                            accountBalanceSlices.reduce((sum, slice) => sum + slice.value * 100, 0),
                          )}
                        </Text>
                      </View>
                    )}
                  />
                  <View className="mt-4 w-full">
                    {accountBalanceSlices.map((slice) => (
                      <View key={slice.id} className="mb-2 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: slice.color }}
                          />
                          <Text className="text-base text-neutral-300">{slice.label}</Text>
                        </View>
                        <Text className="text-base text-neutral-400">
                          {formatCents(slice.value * 100)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              ) : null}
            </>
          ) : null}

          {view === 'month' ? (
            <>
              <Card
                padding={20}
                className="mb-4"
                style={{ borderLeftWidth: 3, borderLeftColor: '#fbbf24' }}
              >
                <View className="mb-4 flex-row items-start justify-between">
                  <View>
                    <Text className="text-base font-medium text-neutral-400">Cuentas</Text>
                    <Text className="mt-0.5 text-sm text-neutral-500">
                      Movimiento neto del mes por cuenta
                    </Text>
                  </View>
                  <Text className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
                    Este mes
                  </Text>
                </View>
                {monthlyBalanceReport.accounts.length === 0 ? (
                  <Text className="text-lg text-neutral-500">Todavía no tienes cuentas.</Text>
                ) : (
                  <>
                    {monthlyBalanceReport.accounts.map((item) => (
                      <View key={item.id} className="mb-3 flex-row items-center justify-between">
                        <Text className="text-lg text-neutral-200">{item.name}</Text>
                        <Text
                          className={
                            item.balanceCents < 0
                              ? 'text-lg font-semibold text-red-500'
                              : 'text-lg font-semibold text-emerald-500'
                          }
                        >
                          {item.balanceCents > 0 ? '+' : ''}
                          {formatCents(item.balanceCents)}
                        </Text>
                      </View>
                    ))}
                    <View className="mt-4 flex-row items-center justify-between border-t border-neutral-800 pt-4">
                      <Text className="text-lg font-semibold text-neutral-50">Balance del mes</Text>
                      <Text
                        className={
                          monthlyBalanceReport.totalBalanceCents < 0
                            ? 'text-xl font-semibold text-red-500'
                            : 'text-xl font-semibold text-emerald-500'
                        }
                      >
                        {monthlyBalanceReport.totalBalanceCents > 0 ? '+' : ''}
                        {formatCents(monthlyBalanceReport.totalBalanceCents)}
                      </Text>
                    </View>
                  </>
                )}
              </Card>

              <Card padding={20} className="mb-4 items-center">
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
                <Text className="mt-1.5 text-sm text-neutral-500">
                  del ingreso ahorrado este mes
                </Text>
              </Card>

              <View className="mb-4 flex-row gap-4">
                <Card padding={20} className="flex-1">
                  <Text className="mb-3 text-base font-medium text-neutral-400">
                    vs. mes anterior
                  </Text>
                  <ChangeRow label="Gastos" change={expenseChange} goodDirection="down" />
                  <ChangeRow label="Ingresos" change={incomeChange} goodDirection="up" />
                </Card>

                <Card padding={20} className="flex-1 items-center">
                  <Text className="text-base font-medium text-neutral-400">Transacciones</Text>
                  <Text className="mt-1.5 text-3xl font-bold text-neutral-50">{expenseCount}</Text>
                  <Text className="mt-1.5 text-sm text-neutral-500">gastos este mes</Text>
                </Card>
              </View>

              <Card padding={20} className="mb-4">
                <Text className="mb-4 text-base font-medium text-neutral-400">
                  Ingreso vs. gastado
                </Text>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-lg text-neutral-200">Este mes</Text>
                  <Text
                    className={
                      currentTotals.balanceCents < 0
                        ? 'text-base font-semibold text-red-500'
                        : 'text-base font-semibold text-emerald-500'
                    }
                  >
                    {currentTotals.balanceCents < 0
                      ? `${formatCents(Math.abs(currentTotals.balanceCents))} sobre lo ingresado`
                      : `${formatCents(currentTotals.balanceCents)} disponibles`}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-neutral-800">
                  <View
                    className={
                      currentTotals.balanceCents < 0 ? 'h-full bg-red-500' : 'h-full bg-amber-400'
                    }
                    style={{
                      width: `${
                        currentTotals.incomeCents > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (currentTotals.expenseCents / currentTotals.incomeCents) * 100,
                              ),
                            )
                          : 0
                      }%`,
                    }}
                  />
                </View>
                <Text className="mt-1.5 text-sm text-neutral-500">
                  {formatCents(currentTotals.expenseCents)} de{' '}
                  {formatCents(currentTotals.incomeCents)}
                </Text>
              </Card>

              {groupBudgets.length > 0 ? (
                <Card padding={20} className="mb-4">
                  <Text className="mb-4 text-base font-medium text-neutral-400">
                    Presupuesto por grupo
                  </Text>
                  {groupBudgets.map((group) => (
                    <View key={group.id} className="mb-4 last:mb-0">
                      <View className="mb-1.5 flex-row items-center justify-between">
                        <Text className="text-lg text-neutral-200">{group.name}</Text>
                        <Text
                          className={
                            group.remainingCents < 0
                              ? 'text-base font-semibold text-red-500'
                              : 'text-base font-semibold text-emerald-500'
                          }
                        >
                          {group.remainingCents < 0
                            ? `${formatCents(Math.abs(group.remainingCents))} sobre el presupuesto`
                            : `${formatCents(group.remainingCents)} disponibles`}
                        </Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-neutral-800">
                        <View
                          className={
                            group.remainingCents < 0 ? 'h-full bg-red-500' : 'h-full bg-amber-400'
                          }
                          style={{
                            width: `${Math.min(100, Math.round((group.spentCents / group.budgetCents) * 100))}%`,
                          }}
                        />
                      </View>
                      <Text className="mt-1.5 text-sm text-neutral-500">
                        {formatCents(group.spentCents)} de {formatCents(group.budgetCents)}
                      </Text>
                    </View>
                  ))}
                </Card>
              ) : null}
            </>
          ) : null}

          {view === 'general' ? (
            <Card padding={20} className="mb-4">
              <Text className="text-base font-medium text-neutral-400">
                Últimos {TREND_MONTHS} meses
              </Text>
              <Text className="mb-4 mt-0.5 text-sm text-neutral-500">
                Gastos, ingresos y ahorro mes a mes
              </Text>
              <View className="flex-row items-end justify-between" style={{ height: 96 }}>
                {trend.map((entry) => (
                  <View
                    key={entry.label}
                    className="items-center"
                    style={{ width: `${100 / TREND_MONTHS}%` }}
                  >
                    <View className="flex-row items-end gap-1" style={{ height: 72 }}>
                      <View
                        className="w-2 rounded-t-sm bg-red-500"
                        style={{ height: Math.max(2, (entry.expenseCents / trendMax) * 72) }}
                      />
                      <View
                        className="w-2 rounded-t-sm bg-emerald-500"
                        style={{ height: Math.max(2, (entry.incomeCents / trendMax) * 72) }}
                      />
                      <View
                        className="w-2 rounded-t-sm bg-amber-400"
                        style={{ height: Math.max(2, (entry.savedCents / trendMax) * 72) }}
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
                <View className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-amber-400" />
                  <Text className="text-sm text-neutral-500">Ahorro</Text>
                </View>
              </View>
            </Card>
          ) : null}

          {view === 'month' ? (
            <>
              <BreakdownCard
                title="Categorías con más gasto"
                subtitle="Top 5 categorías del mes"
                slices={topCategories}
              />
              <BreakdownCard
                title="Grupos con más gasto"
                subtitle="Top 5 grupos del mes"
                slices={topGroups}
              />
            </>
          ) : null}
        </ScrollView>
      )}

      <AccountPickerModal
        visible={isAccountPickerOpen}
        accounts={accounts ?? []}
        selectedAccountId={selectedAccountId}
        onSelect={setSelectedAccountId}
        onClose={() => setIsAccountPickerOpen(false)}
      />

      <DayCalendarModal
        visible={isDayCalendarOpen}
        month={month}
        movements={currentMonthAllMovements}
        onClose={() => setIsDayCalendarOpen(false)}
      />
    </View>
  );
}
