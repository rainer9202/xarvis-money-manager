import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { LineChart } from 'react-native-gifted-charts';

import { AccountPickerModal } from '@/components/account-picker-modal';
import { MonthPickerModal } from '@/components/month-picker-modal';
import { PageHeader } from '@/components/page-header';
import { BreakdownCard, ChangeRow } from '@/components/report-cards';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/error-state';
import { Text } from '@/components/ui/Text';
import { formatCents } from '@/lib/format-money';
import { filterByMonth, useAccountMovements } from '@/lib/hooks/use-account-month-movements';
import { useGroups } from '@/lib/hooks/use-groups';
import { buildBreakdown } from '@/lib/movement-breakdown';
import {
  computeGroupBudgets,
  computeSavingsRate,
  computeWeeklyExpenses,
  percentChange,
  tallyMonth,
} from '@/lib/reports';

/**
 * Same month-scoped cards as app/(app)/reports.tsx's "Este mes" view, but
 * with its own local `month` (not the shared `useMonthFilterStore`) plus a
 * month + account picker (same modals Home uses) to browse any past
 * month/account combination — Reports itself has no picker of its own and
 * just reflects whatever month Home/Charts left active. Unlike Reports'
 * "Este mes" tab, every card here is scoped to the selected account only
 * (not portfolio-wide) — this screen is explicitly "this one account, this
 * one month", nothing pooled across every account. `lib/reports.ts` and
 * components/report-cards.tsx hold the calculations/presentational pieces
 * both screens share.
 */
export function HistoricView({ onBack }: { onBack: () => void }) {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    accountMovements,
    isLoading,
    isError,
    refetch,
  } = useAccountMovements();
  const selectedAccount = accounts?.find((account) => account.id === selectedAccountId);

  const currentTotals = useMemo(
    () => tallyMonth(accountMovements, month, selectedAccountId),
    [accountMovements, month, selectedAccountId],
  );
  const previousTotals = useMemo(
    () => tallyMonth(accountMovements, month.subtract(1, 'month'), selectedAccountId),
    [accountMovements, month, selectedAccountId],
  );
  const expenseChange = percentChange(currentTotals.expenseCents, previousTotals.expenseCents);
  const incomeChange = percentChange(currentTotals.incomeCents, previousTotals.incomeCents);

  // Every movement type for the selected account + month — unlike Reports'
  // equivalents, deliberately NOT portfolio-wide: this screen is "this
  // account, this month" only, so savings/group-budget figures below only
  // count activity that happened on the selected account.
  const currentMonthAllMovements = useMemo(
    () => filterByMonth(accountMovements, month),
    [accountMovements, month],
  );
  const currentMonthMovements = useMemo(
    () => currentMonthAllMovements.filter((movement) => movement.movementType === 'MT01'),
    [currentMonthAllMovements],
  );
  const savingsRate = useMemo(
    () => computeSavingsRate(currentMonthAllMovements, accounts ?? []),
    [currentMonthAllMovements, accounts],
  );
  const { data: groups } = useGroups();
  const groupBudgets = useMemo(
    () => computeGroupBudgets(currentMonthAllMovements, groups ?? []),
    [currentMonthAllMovements, groups],
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
  const weeklyExpenses = useMemo(
    () => computeWeeklyExpenses(accountMovements, month),
    [accountMovements, month],
  );

  return (
    <View className="flex-1 bg-background">
      <PageHeader title="Histórico" onBack={onBack} />

      <View className="mb-4 flex-row gap-4 px-4 pt-4">
        <Pressable
          className="flex-1"
          onPress={() => setIsMonthPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar mes"
        >
          <Card padding={20} className="items-center">
            <Ionicons name="calendar-outline" size={20} color="#fbbf24" />
            <Text
              numberOfLines={1}
              className="mt-1.5 text-base font-semibold capitalize text-neutral-50"
            >
              {month.format('MMMM YYYY')}
            </Text>
            <Text className="mt-1 text-sm text-neutral-500">Mes</Text>
          </Card>
        </Pressable>

        <Pressable
          className="flex-1"
          onPress={() => setIsAccountPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Cambiar cuenta"
        >
          <Card padding={20} className="items-center">
            <Ionicons name="wallet-outline" size={20} color="#fbbf24" />
            <Text numberOfLines={1} className="mt-1.5 text-base font-semibold text-neutral-50">
              {selectedAccount?.name ?? '—'}
            </Text>
            <Text className="mt-1 text-sm text-neutral-500">Cuenta</Text>
          </Card>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-4" color="#fbbf24" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
          <Card padding={20} className="mb-4">
            <Text className="mb-4 text-base font-medium text-neutral-400">Ingreso vs. gastado</Text>
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
              {formatCents(currentTotals.expenseCents)} de {formatCents(currentTotals.incomeCents)}
            </Text>
          </Card>

          <Card padding={20} className="mb-4">
            <Text className="text-base font-medium text-neutral-400">Gastos por semana</Text>
            <Text className="mb-4 mt-0.5 text-sm text-neutral-500">
              Distribución semanal de gastos
            </Text>
            {weeklyExpenses.some((point) => point.expenseCents > 0) ? (
              <LineChart
                data={weeklyExpenses.map((point) => ({
                  value: point.expenseCents / 100,
                  label: `Sem ${point.week}`,
                }))}
                height={140}
                color="#fbbf24"
                thickness={2}
                areaChart
                startFillColor="#fbbf24"
                endFillColor="#0a0a0a"
                startOpacity={0.3}
                endOpacity={0}
                curved
                dataPointsColor="#fbbf24"
                hideRules
                yAxisTextStyle={{ color: '#737373', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#737373', fontSize: 10 }}
                xAxisColor="#262626"
                yAxisColor="#262626"
                noOfSections={3}
                initialSpacing={16}
                endSpacing={16}
              />
            ) : (
              <Text className="text-lg text-neutral-500">Sin gastos este mes.</Text>
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
            <Text className="mt-1.5 text-sm text-neutral-500">del ingreso ahorrado ese mes</Text>
          </Card>

          <View className="mb-4 flex-row gap-4">
            <Card padding={20} className="flex-1">
              <Text className="mb-3 text-base font-medium text-neutral-400">vs. mes anterior</Text>
              <ChangeRow label="Gastos" change={expenseChange} goodDirection="down" />
              <ChangeRow label="Ingresos" change={incomeChange} goodDirection="up" />
            </Card>

            <Card padding={20} className="flex-1 items-center">
              <Text className="text-base font-medium text-neutral-400">Transacciones</Text>
              <Text className="mt-1.5 text-3xl font-bold text-neutral-50">{expenseCount}</Text>
              <Text className="mt-1.5 text-sm text-neutral-500">gastos ese mes</Text>
            </Card>
          </View>

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
        </ScrollView>
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
    </View>
  );
}
