// reports.tsx renders <Ionicons /> directly (not just as a type), which
// transitively requires expo-font -> expo-asset — a module not installed in
// this project (see the pre-existing accounts-screen.test.tsx failure). We
// only need the three pure helpers below, so stub the icon package instead
// of pulling in that broken chain.
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import dayjs from 'dayjs';

import type { Movement } from '../lib/api/movements';
import type { BreakdownSlice } from '../lib/movement-breakdown';
import { buildCategoryChanges, percentChange, tallyMonth } from '../app/(app)/reports';

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 'mv-1',
    amountCents: 1000,
    date: '2026-07-01',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    categoryLabel: 'Comida',
    movementType: 'MT01',
    movementTypeLabel: 'Gasto',
    createdAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeSlice(overrides: Partial<BreakdownSlice> = {}): BreakdownSlice {
  return {
    id: 'cat-1',
    label: 'Comida',
    amountCents: 100,
    color: '#22c55e',
    value: 1,
    percent: 100,
    ...overrides,
  };
}

describe('tallyMonth', () => {
  const month = dayjs('2026-07-01');

  it('sums expense (MT01) and income (MT02) for the given month', () => {
    const movements = [
      makeMovement({ id: 'mv-1', date: '2026-07-05', movementType: 'MT01', amountCents: 300 }),
      makeMovement({ id: 'mv-2', date: '2026-07-10', movementType: 'MT02', amountCents: 500 }),
    ];

    const result = tallyMonth(movements, month, 'acc-1');

    expect(result).toEqual({ expenseCents: 300, incomeCents: 500, balanceCents: 200 });
  });

  it('ignores movements from other months', () => {
    const movements = [
      makeMovement({ id: 'mv-1', date: '2026-06-30', movementType: 'MT01', amountCents: 999 }),
      makeMovement({ id: 'mv-2', date: '2026-08-01', movementType: 'MT02', amountCents: 999 }),
      makeMovement({ id: 'mv-3', date: '2026-07-15', movementType: 'MT01', amountCents: 100 }),
    ];

    const result = tallyMonth(movements, month, 'acc-1');

    expect(result).toEqual({ expenseCents: 100, incomeCents: 0, balanceCents: -100 });
  });

  it('counts a transfer (MT03) landing on the selected account as income', () => {
    const movements = [
      makeMovement({ id: 'mv-1', date: '2026-07-05', movementType: 'MT01', amountCents: 500, accountId: 'acc-1' }),
      makeMovement({
        id: 'mv-2',
        date: '2026-07-05',
        movementType: 'MT03',
        amountCents: 500,
        accountId: 'acc-2',
        toAccountId: 'acc-1',
      }),
    ];

    const result = tallyMonth(movements, month, 'acc-1');

    expect(result).toEqual({ expenseCents: 500, incomeCents: 500, balanceCents: 0 });
  });

  it('returns all zeros for an empty list', () => {
    expect(tallyMonth([], month, 'acc-1')).toEqual({ expenseCents: 0, incomeCents: 0, balanceCents: 0 });
  });
});

describe('percentChange', () => {
  it('returns null when previous is 0 (divide-by-zero guard)', () => {
    expect(percentChange(100, 0)).toBeNull();
  });

  it('returns a positive percentage for an increase', () => {
    expect(percentChange(150, 100)).toBe(50);
  });

  it('returns a negative percentage for a decrease', () => {
    expect(percentChange(50, 100)).toBe(-50);
  });

  it('rounds the result', () => {
    // (110 - 100) / 100 = 10% exactly, use a value that requires rounding
    expect(percentChange(103, 100)).toBe(3);
    expect(percentChange(107, 100)).toBe(7);
  });
});

describe('buildCategoryChanges', () => {
  it('merges two periods into per-category deltas', () => {
    const current = [makeSlice({ id: 'cat-1', label: 'Comida', amountCents: 300 })];
    const previous = [makeSlice({ id: 'cat-1', label: 'Comida', amountCents: 200 })];

    const result = buildCategoryChanges(current, previous, 5);

    expect(result).toEqual([
      { id: 'cat-1', label: 'Comida', color: '#22c55e', currentCents: 300, previousCents: 200, deltaCents: 100 },
    ]);
  });

  it('shows a category present only in the current period as a full swing', () => {
    const current = [makeSlice({ id: 'cat-new', label: 'Nueva', amountCents: 400 })];
    const previous: BreakdownSlice[] = [];

    const result = buildCategoryChanges(current, previous, 5);

    expect(result).toEqual([
      { id: 'cat-new', label: 'Nueva', color: '#22c55e', currentCents: 400, previousCents: 0, deltaCents: 400 },
    ]);
  });

  it('shows a category present only in the previous period as a full negative swing', () => {
    const current: BreakdownSlice[] = [];
    const previous = [makeSlice({ id: 'cat-old', label: 'Vieja', amountCents: 400 })];

    const result = buildCategoryChanges(current, previous, 5);

    expect(result).toEqual([
      { id: 'cat-old', label: 'Vieja', color: '#22c55e', currentCents: 0, previousCents: 400, deltaCents: -400 },
    ]);
  });

  it('filters out zero-delta entries', () => {
    const current = [makeSlice({ id: 'cat-1', amountCents: 300 })];
    const previous = [makeSlice({ id: 'cat-1', amountCents: 300 })];

    expect(buildCategoryChanges(current, previous, 5)).toEqual([]);
  });

  it('sorts by absolute delta size descending', () => {
    const current = [
      makeSlice({ id: 'cat-small', label: 'Small', amountCents: 110 }),
      makeSlice({ id: 'cat-big', label: 'Big', amountCents: 900 }),
    ];
    const previous = [
      makeSlice({ id: 'cat-small', label: 'Small', amountCents: 100 }),
      makeSlice({ id: 'cat-big', label: 'Big', amountCents: 100 }),
    ];

    const result = buildCategoryChanges(current, previous, 5);

    expect(result.map((entry) => entry.id)).toEqual(['cat-big', 'cat-small']);
  });

  it('respects the limit param', () => {
    const current = [
      makeSlice({ id: 'cat-1', amountCents: 100 }),
      makeSlice({ id: 'cat-2', amountCents: 200 }),
      makeSlice({ id: 'cat-3', amountCents: 300 }),
    ];
    const previous: BreakdownSlice[] = [];

    const result = buildCategoryChanges(current, previous, 2);

    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.id)).toEqual(['cat-3', 'cat-2']);
  });
});
