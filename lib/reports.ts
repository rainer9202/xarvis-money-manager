import dayjs, { type Dayjs } from 'dayjs';

import type { Account } from '@/lib/api/accounts';
import type { Group } from '@/lib/api/groups';
import type { Movement } from '@/lib/api/movements';
import { getAccountTypeColor } from '@/lib/account-color';
import { filterByMonth, tallyExpenseIncome } from '@/lib/hooks/use-account-month-movements';

// Shared between app/(app)/reports.tsx (global-month view) and
// app/(app)/profile/historic.tsx (arbitrary-month view) — both render the
// same set of month-scoped stat cards, just driven by a different `month`
// source (the shared useMonthFilterStore vs. a locally picked one).

export type MonthTotals = { expenseCents: number; incomeCents: number; balanceCents: number };

export function tallyMonth(
  movements: Movement[],
  month: Dayjs,
  accountId: string | null,
): MonthTotals {
  return tallyExpenseIncome(filterByMonth(movements, month), accountId);
}

/** `null` when there's no previous-period value to compare against (avoids
 * a divide-by-zero reading as a meaningless ±∞%). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Portfolio-wide — "saved" only makes sense across every account, not just
 * whichever one happens to be selected (for-frontend.md §5.2's AT04
 * accounts aren't necessarily the selected one, and the money moved into
 * them can come from any account). A transfer whose destination is type
 * AT04 (Ahorro); a transfer *out* of savings, or between two non-savings
 * accounts, doesn't count.
 */
export function computeSavedCents(movements: Movement[], accounts: Account[]): number {
  const savingsAccountIds = new Set(
    accounts.filter((account) => account.type === 'AT04').map((account) => account.id),
  );
  let savedCents = 0;
  for (const movement of movements) {
    if (
      movement.movementType === 'MT03' &&
      movement.toAccountId !== undefined &&
      savingsAccountIds.has(movement.toAccountId)
    ) {
      savedCents += movement.amountCents;
    }
  }
  return savedCents;
}

/** `computeSavedCents` as a percentage of the same period's income (every
 * MT02, on any account) — see `computeSavedCents` for why both halves are
 * portfolio-wide, not scoped to a single selected account. */
export function computeSavingsRate(movements: Movement[], accounts: Account[]): number | null {
  const incomeCents = movements
    .filter((movement) => movement.movementType === 'MT02')
    .reduce((sum, movement) => sum + movement.amountCents, 0);
  const savedCents = computeSavedCents(movements, accounts);
  return incomeCents > 0 ? Math.round((savedCents / incomeCents) * 100) : null;
}

export type GroupBudget = {
  id: string;
  name: string;
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
};

/**
 * Portfolio-wide, same reasoning as `computeSavingsRate` — a Group tags
 * movements regardless of which account they're on (for-frontend.md §5.1),
 * so "spent against this group's budget" has to look across every account
 * too. Only MT01 (Gasto) counts as spend; only active groups with a
 * `budgetCents` cap set are worth a card (nothing to compare a cap-less
 * group against).
 */
export function computeGroupBudgets(movements: Movement[], groups: Group[]): GroupBudget[] {
  const spentByGroupId = new Map<string, number>();
  for (const movement of movements) {
    if (movement.movementType !== 'MT01' || movement.groupId === undefined) continue;
    spentByGroupId.set(
      movement.groupId,
      (spentByGroupId.get(movement.groupId) ?? 0) + movement.amountCents,
    );
  }
  return groups
    .filter(
      (group): group is Group & { budgetCents: number } =>
        group.isActive && group.budgetCents !== null,
    )
    .map((group) => {
      const spentCents = spentByGroupId.get(group.id) ?? 0;
      return {
        id: group.id,
        name: group.name,
        budgetCents: group.budgetCents,
        spentCents,
        remainingCents: group.budgetCents - spentCents,
      };
    });
}

export type MonthlyAccountBalance = { id: string; name: string; balanceCents: number };
export type MonthlyBalanceReport = { accounts: MonthlyAccountBalance[]; totalBalanceCents: number };

/**
 * Monthly counterpart to `getBalanceReport` (which is all-time, live —
 * there's no backend endpoint for a point-in-time historical balance).
 * "Balance" here means net movement *within* the given month, per account:
 * income in minus expenses/transfers out. Deliberately doesn't reuse
 * `tallyExpenseIncome` — that helper assumes its input is already
 * server-filtered to one account (for-frontend.md §5.4's `accountId` query
 * param), so it sums every MT01/MT02 it's given without checking whose
 * account they belong to. `movements` here is portfolio-wide, so MT01/MT02
 * need an explicit `movement.accountId === account.id` check same as MT03
 * already gets. Summed across every account, a transfer between two of the
 * user's own accounts cancels out (one account's -amount, the other's
 * +amount), leaving `totalBalanceCents` equal to the month's real net
 * income minus expenses, portfolio-wide.
 */
export function computeMonthlyAccountBalances(
  movements: Movement[],
  accounts: Account[],
): MonthlyBalanceReport {
  const balances = accounts.map((account) => {
    let balanceCents = 0;
    for (const movement of movements) {
      if (movement.movementType === 'MT01' && movement.accountId === account.id) {
        balanceCents -= movement.amountCents;
      } else if (movement.movementType === 'MT02' && movement.accountId === account.id) {
        balanceCents += movement.amountCents;
      } else if (movement.movementType === 'MT03') {
        if (movement.accountId === account.id) balanceCents -= movement.amountCents;
        else if (movement.toAccountId === account.id) balanceCents += movement.amountCents;
      }
    }
    return { id: account.id, name: account.name, balanceCents };
  });
  const totalBalanceCents = balances.reduce((sum, entry) => sum + entry.balanceCents, 0);
  return { accounts: balances, totalBalanceCents };
}

export type AccountBalanceSlice = { id: string; label: string; value: number; color: string };

/**
 * Portfolio composition — how the *current* (all-time, live) total balance
 * splits across accounts, colored by account type (same palette as
 * lib/account-color.ts uses everywhere else an account shows up). Only
 * positive balances are chart-able as a pie slice; a negative one (e.g. AT03
 * credit card debt) doesn't have a "share of the pie" — it's excluded
 * rather than shown as a 0/negative wedge.
 */
export function computeAccountBalanceSlices(
  balances: { id: string; name: string; balanceCents: number }[],
  accounts: Account[],
): AccountBalanceSlice[] {
  const typeById = new Map(accounts.map((account) => [account.id, account.type]));
  return balances
    .filter((entry) => entry.balanceCents > 0)
    .map((entry) => ({
      id: entry.id,
      label: entry.name,
      value: entry.balanceCents / 100,
      color: getAccountTypeColor(typeById.get(entry.id) ?? 'AT01'),
    }));
}

export type WeeklyExpensePoint = { week: number; expenseCents: number };

/** One point per calendar week of `month` (week 1 = days 1-7, week 2 =
 * days 8-14, ...; the last week can be shorter than 7 days) — only MT01
 * (Gasto) counts, same as every other "spend" figure. Few enough points
 * (at most 5) that a line chart never needs a horizontal scroll. */
export function computeWeeklyExpenses(movements: Movement[], month: Dayjs): WeeklyExpensePoint[] {
  const numWeeks = Math.ceil(month.daysInMonth() / 7);
  const totals = new Array<number>(numWeeks).fill(0);
  for (const movement of filterByMonth(movements, month)) {
    if (movement.movementType !== 'MT01') continue;
    const weekIndex = Math.floor((dayjs(movement.date).date() - 1) / 7);
    totals[weekIndex] += movement.amountCents;
  }
  return totals.map((expenseCents, index) => ({ week: index + 1, expenseCents }));
}
