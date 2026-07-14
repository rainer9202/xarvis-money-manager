import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { formatCents } from '@/lib/format-money';
import { buildBreakdown } from '@/lib/movement-breakdown';

// Shared between app/(app)/reports.tsx and app/(app)/profile/historic.tsx —
// both render the same month-scoped stat cards, just for a different month.

type ChangeRowProps = {
  label: string;
  change: number | null;
  /** Which direction reads as "good" for this metric — down for Expenses
   * (spent less), up for Income (earned more) — so the arrow color means
   * the same thing ("this is going well") for both rows even though the
   * numeric sign logic differs. */
  goodDirection: 'up' | 'down';
};

export function ChangeRow({ label, change, goodDirection }: ChangeRowProps) {
  if (change === null) {
    return (
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-lg text-neutral-300">{label}</Text>
        <Text className="text-lg text-neutral-500">—</Text>
      </View>
    );
  }

  const isUp = change > 0;
  const isGood =
    change === 0 || (isUp && goodDirection === 'up') || (!isUp && goodDirection === 'down');
  const colorClassName = isGood ? 'text-emerald-500' : 'text-red-500';

  return (
    <View className="mb-1.5 flex-row items-center justify-between">
      <Text className="text-lg text-neutral-300">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <Ionicons
          name={isUp ? 'arrow-up' : 'arrow-down'}
          size={13}
          color={isGood ? '#10b981' : '#ef4444'}
        />
        <Text className={`text-lg font-semibold ${colorClassName}`}>{Math.abs(change)}%</Text>
      </View>
    </View>
  );
}

export function BreakdownCard({
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
            <Text className="text-lg font-semibold text-red-500">
              -{formatCents(slice.amountCents)}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}
