import { Platform, Pressable, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Dayjs } from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import type { Account } from '@/lib/api/accounts';
import { formatCents } from '@/lib/format-money';

type MovementsSummaryHeaderProps = {
  month: Dayjs;
  /** Month selector + Gastos/Ingresos(or Límite)/Balance row — Home and
   * Charts show it (default); Reports doesn't (it has its own,
   * differently-scoped stat cards below the header, and no month-selector
   * UI of its own — see `onOpenMonthPicker`), so the whole row is skipped. */
  showStats?: boolean;
  expenseCents?: number;
  incomeCents?: number;
  balanceCents?: number;
  /** The currently selected account (full record, not just its id) — only
   * used to detect a Crédito account and swap the Ingresos cell for the
   * card's limit (and its Balance cell for available credit). Every other
   * field here is the month-scoped, account-aware tally from
   * lib/hooks/use-account-month-movements.ts's `tallyExpenseIncome`, where
   * Ingresos - Gastos already equals Balance for the selected account. */
  selectedAccount?: Account;
  onOpenAccountPicker: () => void;
  /** Reports (`showStats={false}`) has no month-selector UI of its own —
   * it just reflects whatever month is already active in the shared
   * `useMonthFilterStore`, set from Home/Charts. Unused (and safe to omit)
   * when `showStats={false}`. */
  onOpenMonthPicker?: () => void;
  onPressCalendar: () => void;
};

/**
 * Navbar, shared verbatim between Home (app/(app)/index.tsx), Charts
 * (app/(app)/charts.tsx), and Reports (app/(app)/reports.tsx) so all three
 * read as the same app. Home/Charts also get the month selector +
 * Expenses/Income/Balance row (`showStats`, default true); Reports has its
 * own, differently-scoped stat cards below the header instead, and reflects
 * whatever month is already active in the shared `useMonthFilterStore`
 * rather than offering its own way to change it. Data comes from
 * lib/hooks/use-account-month-movements.ts; the account/month picker modals
 * themselves stay owned by each screen (their open/close state is local UI
 * state, not shared).
 */
export function MovementsSummaryHeader({
  month,
  showStats = true,
  expenseCents = 0,
  incomeCents = 0,
  balanceCents = 0,
  selectedAccount,
  onOpenAccountPicker,
  onOpenMonthPicker,
  onPressCalendar,
}: MovementsSummaryHeaderProps) {
  // "Ingresos" (this month's income) doesn't apply to a Crédito account —
  // swap that cell for the card's limit instead, so the user has the number
  // that actually matters for a credit card front and center. Balance
  // becomes "available credit" (limit minus live debt) instead of the
  // month-scoped Ingresos-Gastos identity, since a card's limit isn't a
  // monthly-reset concept (for-frontend.md §5.2: balanceCents is never
  // clamped by creditLimitCents and carries across months).
  const creditLimitCents =
    selectedAccount?.type === 'AT03' ? selectedAccount.creditLimitCents : null;
  const isCredit = creditLimitCents !== null && creditLimitCents !== undefined;
  const displayBalanceCents = isCredit
    ? creditLimitCents! + selectedAccount!.balanceCents
    : balanceCents;
  // For a Crédito account, `incomeCents` is entirely payments toward the
  // card (a transfer landing on this account, tallyExpenseIncome's MT03
  // "destination" leg — a card has no real income of its own), so a
  // payment should net against this month's Gastos instead of sitting in
  // its own bucket the header no longer shows (Ingresos is swapped for
  // Límite above). Clamped at 0: paying off more than this month's spend
  // (e.g. clearing prior months' debt) shouldn't show as negative Gastos.
  const displayExpenseCents = isCredit ? Math.max(0, expenseCents - incomeCents) : expenseCents;
  const insets = useSafeAreaInsets();
  // insets.top can report 0 on Android when the edge-to-edge inset dispatch
  // hasn't kicked in yet — StatusBar.currentHeight reads the real native bar
  // height directly, so it's a reliable floor for the same value.
  const topInset =
    Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;

  return (
    <View
      className={
        showStats
          ? 'border-b border-nav-border bg-nav pb-5'
          : 'border-b border-nav-border bg-nav pb-3'
      }
      style={{ paddingTop: topInset }}
    >
      <View
        className={
          showStats
            ? 'mb-3 flex-row items-center justify-between px-6 pb-2 pt-5'
            : 'flex-row items-center justify-between px-6 pb-2 pt-5'
        }
      >
        <Pressable
          onPress={onOpenAccountPicker}
          accessibilityRole="button"
          accessibilityLabel="Cambiar cuenta"
          hitSlop={8}
        >
          <Ionicons name="menu" size={28} color="#fafafa" />
        </Pressable>
        <Text className="text-xl font-bold uppercase tracking-wide text-neutral-50">
          Xarvis Cuartos
        </Text>
        <Pressable
          onPress={onPressCalendar}
          accessibilityRole="button"
          accessibilityLabel="Calendario"
          hitSlop={8}
        >
          <Ionicons name="calendar-outline" size={26} color="#fafafa" />
        </Pressable>
      </View>

      {showStats ? (
        <View className="flex-row items-center pl-6 pr-4">
          <Pressable
            onPress={onOpenMonthPicker}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar mes"
            className="mr-3 items-center py-1.5 pr-3"
          >
            <Ionicons name="calendar-outline" size={20} color="#fbbf24" />
            <Text className="mt-1 text-sm font-semibold text-neutral-50">
              {month.format('MMM')}
            </Text>
          </Pressable>
          <View className="flex-1 items-center px-1">
            <Text className="text-sm font-medium text-neutral-400">Gastos</Text>
            <Text
              className="mt-1 text-lg font-semibold text-red-500"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {displayExpenseCents > 0 ? '-' : ''}
              {formatCents(displayExpenseCents)}
            </Text>
          </View>
          <View className="flex-1 items-center px-1">
            <Text className="text-sm font-medium text-neutral-400">
              {isCredit ? 'Límite' : 'Ingresos'}
            </Text>
            <Text
              className="mt-1 text-lg font-semibold text-neutral-50"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCents(isCredit ? creditLimitCents! : incomeCents)}
            </Text>
          </View>
          <View className="flex-1 items-center px-1">
            <Text className="text-sm font-medium text-neutral-400">Balance</Text>
            <Text
              className="mt-1 text-lg font-semibold text-amber-400"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCents(displayBalanceCents)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
