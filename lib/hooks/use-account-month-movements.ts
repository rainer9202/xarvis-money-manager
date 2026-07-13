import { useEffect, useMemo } from 'react';
import dayjs, { type Dayjs } from 'dayjs';

import type { Movement } from '@/lib/api/movements';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useMovements } from '@/lib/hooks/use-movements';
import { useAccountFilterStore } from '@/store/account-filter-store';

/**
 * A movement belongs to an account if either leg touches it — a transfer's
 * `toAccountId` is the credit leg, so both legs must show when viewing
 * either side, matching how the backend computes `balanceCents` live from
 * the account's own movement ledger (for-frontend.md §5.2).
 */
function filterByAccount(movements: Movement[] | undefined, accountId: string | null) {
  if (!accountId) return movements ?? [];
  return (movements ?? []).filter((movement) => movement.accountId === accountId || movement.toAccountId === accountId);
}

export function filterByMonth(movements: Movement[], month: Dayjs) {
  return movements
    .filter((movement) => dayjs(movement.date).isSame(month, 'month'))
    .sort((a, b) => {
      // `date` only carries a calendar day (no time-of-day — the date
      // picker is day-granularity, see components/movement-form.tsx), so
      // same-day movements tie here. Break ties with `createdAt` so a
      // movement just added today sorts above earlier ones from the same
      // day instead of at the bottom.
      const dateDiff = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
      if (dateDiff !== 0) return dateDiff;
      return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
    });
}

/**
 * `accountId` is the account this tally is "from the point of view of" — a
 * transfer (MT03) has no category-level meaning (it's neither spend nor
 * earn app-wide, see lib/movement-breakdown.ts), but from a single
 * account's perspective it still moves money in or out exactly like an
 * expense/income would: debits `accountId` (for-frontend.md §5.4), so it
 * counts as an expense when this account is the source, and as income when
 * it's the destination (`toAccountId`). This keeps `incomeCents -
 * expenseCents === balanceCents` true for the navbar header, which shows
 * these three numbers side by side and needs the arithmetic to add up for
 * the selected account. Pass `accountId: null` to fall back to the old
 * MT03-excluded behavior (not currently used anywhere, kept for callers
 * that don't have a single account in view).
 */
export function tallyExpenseIncome(movements: Movement[], accountId: string | null) {
  let expense = 0;
  let income = 0;
  for (const movement of movements) {
    if (movement.movementType === 'MT01') {
      expense += movement.amountCents;
    } else if (movement.movementType === 'MT02') {
      income += movement.amountCents;
    } else if (movement.movementType === 'MT03') {
      if (movement.accountId === accountId) expense += movement.amountCents;
      else if (movement.toAccountId === accountId) income += movement.amountCents;
    }
  }
  return { expenseCents: expense, incomeCents: income, balanceCents: income - expense };
}

/** Shared "which account is selected, defaulting to principal" resolution —
 * both hooks below need it, but fetch movements with different params
 * (`historic: true` vs. one `month` at a time), so the movements query
 * itself isn't shared. */
function useSelectedAccount() {
  const selectedAccountId = useAccountFilterStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useAccountFilterStore((state) => state.setSelectedAccountId);
  const { data: accounts } = useAccounts();

  // Default to the principal account on load, falling back to the first
  // account when none is marked principal. Also re-derives if the previously
  // selected account no longer exists in the fresh list (e.g. it was
  // deleted), while still leaving a valid manual selection untouched.
  useEffect(() => {
    if (!accounts || accounts.length === 0) return;
    if (selectedAccountId !== null && accounts.some((account) => account.id === selectedAccountId)) return;
    const principal = accounts.find((account) => account.isPrincipal === true);
    setSelectedAccountId((principal ?? accounts[0]).id);
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  return { accounts, selectedAccountId, setSelectedAccountId };
}

/**
 * Reports-only data source: full history for the selected account
 * (`historic: true`, for-frontend.md §5.4) — its 6-month trend and
 * category/group breakdowns need more than one month of data loaded at
 * once, unlike Home/Charts (see `useAccountMonthMovements` below, which
 * fetches one month at a time instead of the whole ledger).
 */
export function useAccountMovements() {
  const { accounts, selectedAccountId, setSelectedAccountId } = useSelectedAccount();

  // `enabled` waits for the principal-account effect above to resolve
  // `selectedAccountId` before firing at all — otherwise this fires once
  // with `accountId: undefined` (every account's history) and immediately
  // again once the account resolves, a redundant double-fetch on every
  // fresh load.
  const {
    data: movements,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useMovements({ accountId: selectedAccountId ?? undefined, historic: true }, { enabled: selectedAccountId !== null });

  const accountMovements = useMemo(() => filterByAccount(movements, selectedAccountId), [movements, selectedAccountId]);

  return { accounts, selectedAccountId, setSelectedAccountId, accountMovements, isLoading, isFetching, isError, refetch };
}

/**
 * Home/Charts data source. Fetches only the selected month server-side
 * (`month` param, for-frontend.md §5.4) instead of the account's entire
 * history — switching months stays a small request regardless of how many
 * years of movements the account has accumulated. `filterByMonth` still
 * runs over the (already server-scoped) result as the same defensive
 * client-side safety net every other filter in this app gets (see
 * lib/api/movements.ts) — cheap once the server has already done the real
 * narrowing, and it's what supplies the sort order the UI relies on.
 */
export function useAccountMonthMovements(month: Dayjs) {
  const { accounts, selectedAccountId, setSelectedAccountId } = useSelectedAccount();

  const {
    data: movements,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useMovements(
    { accountId: selectedAccountId ?? undefined, month: month.format('YYYY-MM') },
    { enabled: selectedAccountId !== null },
  );

  const accountMovements = useMemo(() => filterByAccount(movements, selectedAccountId), [movements, selectedAccountId]);
  const monthMovements = useMemo(() => filterByMonth(accountMovements, month), [accountMovements, month]);
  const totals = useMemo(
    () => tallyExpenseIncome(monthMovements, selectedAccountId),
    [monthMovements, selectedAccountId],
  );

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    monthMovements,
    isLoading,
    isFetching,
    isError,
    refetch,
    ...totals,
  };
}
