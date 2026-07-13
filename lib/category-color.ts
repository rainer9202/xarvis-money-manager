import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { MovementType } from '@/lib/movement-type';

/**
 * Fixed palette for category-icon circles. Chosen to read clearly on the
 * app's near-black background (saturated Tailwind ~500 shades). The backend
 * stores no color per category, so this is derived purely client-side.
 */
const CATEGORY_COLOR_PALETTE = [
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#3b82f6', // blue-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#ef4444', // red-500
] as const;

/**
 * Deterministic djb2 string hash — same categoryId always maps to the same
 * palette color, with no lookup table to keep in sync and no per-session
 * randomness.
 */
function hashString(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return Math.abs(hash);
}

/** Background color for a category's icon circle, hashed off `categoryId`. */
export function getCategoryColor(categoryId: string): string {
  const index = hashString(categoryId) % CATEGORY_COLOR_PALETTE.length;
  return CATEGORY_COLOR_PALETTE[index];
}

// Red = money out, green = money in, blue = moving between your own
// accounts — same palette used for the hero amount tint on the add/edit
// movement form.
const MOVEMENT_TYPE_CIRCLE_COLOR: Record<MovementType, string> = {
  MT01: '#f87171',
  MT02: '#4ade80',
  MT03: '#60a5fa',
};

/** Background color for a movement's icon circle — keyed by movementType
 * (not category), so the circle communicates expense/income/transfer at a
 * glance. Category still drives color in the Charts pie breakdown, where
 * slices need to stay distinguishable within a single movement type. */
export function getMovementTypeColor(movementType: MovementType): string {
  return MOVEMENT_TYPE_CIRCLE_COLOR[movementType];
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// The backend stores no icon per category, only per movement type
// (MT01=Gasto/MT02=Ingreso/MT03=Transferencia) — one glyph per type is all
// the data supports (for-frontend.md §5.0). Keyed by the stable code, not
// the display label, since every call site has the code readily available.
const MOVEMENT_TYPE_ICON: Record<MovementType, IoniconName> = {
  MT01: 'cart-outline',
  MT02: 'briefcase-outline',
  MT03: 'swap-horizontal-outline',
};

const DEFAULT_MOVEMENT_TYPE_ICON: IoniconName = 'ellipse-outline';

/** Icon glyph for a movement type — falls back to a neutral glyph if the
 * value isn't one of the known enum members. */
export function getMovementTypeIcon(movementType: MovementType | undefined): IoniconName {
  if (!movementType) return DEFAULT_MOVEMENT_TYPE_ICON;
  return MOVEMENT_TYPE_ICON[movementType] ?? DEFAULT_MOVEMENT_TYPE_ICON;
}

/**
 * Shared semantic-color className for a movement's signed amount (red for
 * expense, green for income, neutral for transfer — transfers are neither
 * spend nor earn, for-frontend.md §6). Same Tailwind shades already used on
 * Reports/Profile > Accounts (`text-red-500`/`text-emerald-500`); centralized
 * here so Home and the movement detail view don't each redefine it.
 */
export function getMovementAmountColorClassName(movementType: MovementType): string {
  if (movementType === 'MT01') return 'text-red-500';
  if (movementType === 'MT02') return 'text-emerald-500';
  return 'text-neutral-50';
}
