import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { Movement } from '@/lib/api/movements';
import { getMovementAmountColorClassName, getMovementTypeColor, getMovementTypeIcon } from '@/lib/category-color';
import { formatCents } from '@/lib/format-money';

type MovementDetailProps = {
  movement: Movement;
  categoryName: string;
  accountName: string;
  toAccountName?: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
};

/**
 * Read-only detail view shown when tapping a movement row on Home — the
 * user lands here first (not directly in the editable form), matching a
 * standard "view, then opt into edit" flow. Reuses the exact color/icon
 * helpers Home uses for its rows so this screen and the list stay visually
 * consistent.
 */
export function MovementDetail({
  movement,
  categoryName,
  accountName,
  toAccountName,
  onEdit,
  onDelete,
  isDeleting,
}: MovementDetailProps) {
  const prefix = movement.movementType === 'MT01' ? '-' : '';

  return (
    <View>
      <View className="mb-6 items-center">
        <View
          className="mb-3 h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: getMovementTypeColor(movement.movementType) }}
        >
          <Ionicons name={getMovementTypeIcon(movement.movementType)} size={28} color="#fafafa" />
        </View>
        <Text className={`text-3xl font-bold ${getMovementAmountColorClassName(movement.movementType)}`}>
          {prefix}
          {formatCents(movement.amountCents)}
        </Text>
        <Text className="mt-1 text-sm font-medium text-neutral-400">{movement.movementTypeLabel}</Text>
      </View>

      <Card className="mb-4">
        <View className="flex-row items-center justify-between px-3 py-3">
          <Text className="text-sm text-neutral-400">Categoría</Text>
          <Text className="text-sm font-medium text-neutral-50">{categoryName}</Text>
        </View>
        {movement.groupLabel ? (
          <View className="flex-row items-center justify-between border-t border-neutral-800 px-3 py-3">
            <Text className="text-sm text-neutral-400">Grupo</Text>
            <Text className="text-sm font-medium text-neutral-50">{movement.groupLabel}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center justify-between border-t border-neutral-800 px-3 py-3">
          <Text className="text-sm text-neutral-400">Cuenta</Text>
          <Text className="text-sm font-medium text-neutral-50">{accountName}</Text>
        </View>
        {toAccountName ? (
          <View className="flex-row items-center justify-between border-t border-neutral-800 px-3 py-3">
            <Text className="text-sm text-neutral-400">Cuenta destino</Text>
            <Text className="text-sm font-medium text-neutral-50">{toAccountName}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center justify-between border-t border-neutral-800 px-3 py-3">
          <Text className="text-sm text-neutral-400">Fecha</Text>
          <Text className="text-sm font-medium text-neutral-50">{dayjs(movement.date).format('D [de] MMMM [de] YYYY')}</Text>
        </View>
        {movement.note ? (
          <View className="border-t border-neutral-800 px-3 py-3">
            <Text className="mb-1 text-sm text-neutral-400">Nota</Text>
            <Text className="text-sm font-medium text-neutral-50">{movement.note}</Text>
          </View>
        ) : null}
      </Card>

      <View className="flex-row gap-3">
        <Button className="flex-1" onPress={onEdit}>
          Editar
        </Button>
        <Button className="flex-1" variant="destructive" isLoading={isDeleting} onPress={onDelete}>
          Eliminar
        </Button>
      </View>
    </View>
  );
}
