import type { Movement } from '@/lib/api/movements';
import { getCategoryColor } from '@/lib/category-color';

export type BreakdownDimension = 'category' | 'group';

export type BreakdownSlice = {
  id: string;
  label: string;
  amountCents: number;
  color: string;
  value: number;
  percent: number;
};

// Groups are optional per-movement (for-frontend.md §5.1) — movements with
// no groupId are bucketed here instead of being dropped, so a "by group"
// total still matches the "by category" total for the same movements.
const UNGROUPED_ID = 'ungrouped';
const UNGROUPED_COLOR = '#525252'; // neutral-600

/**
 * Buckets movements by category or group and sums their amounts — shared by
 * Charts (app/(app)/charts.tsx) and Reports (app/(app)/reports.tsx), both of
 * which need "how much per category/group" from the same movement list.
 */
export function buildBreakdown(movements: Movement[], dimension: BreakdownDimension, limit?: number): BreakdownSlice[] {
  const totals = new Map<string, { amountCents: number; label: string; color: string }>();
  for (const movement of movements) {
    const key = dimension === 'category' ? movement.categoryId : (movement.groupId ?? UNGROUPED_ID);
    const label = dimension === 'category' ? movement.categoryLabel : (movement.groupLabel ?? 'Ungrouped');
    const color =
      dimension === 'category'
        ? getCategoryColor(movement.categoryId)
        : movement.groupId
          ? getCategoryColor(movement.groupId)
          : UNGROUPED_COLOR;
    const existing = totals.get(key);
    totals.set(key, { amountCents: (existing?.amountCents ?? 0) + movement.amountCents, label, color });
  }

  const total = Array.from(totals.values()).reduce((sum, entry) => sum + entry.amountCents, 0);
  const slices = Array.from(totals.entries())
    .sort((a, b) => b[1].amountCents - a[1].amountCents)
    .map(([id, { amountCents, label, color }]) => ({
      id,
      label,
      amountCents,
      color,
      value: amountCents / 100,
      percent: total > 0 ? Math.round((amountCents / total) * 100) : 0,
    }));

  return limit ? slices.slice(0, limit) : slices;
}
