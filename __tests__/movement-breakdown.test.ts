import type { Movement } from '../lib/api/movements';
import { buildBreakdown } from '../lib/movement-breakdown';

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

describe('buildBreakdown', () => {
  it('returns an empty array for no movements', () => {
    expect(buildBreakdown([], 'category')).toEqual([]);
  });

  it('returns a single 100% slice for one movement', () => {
    const result = buildBreakdown([makeMovement({ amountCents: 500 })], 'category');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'cat-1',
      label: 'Comida',
      amountCents: 500,
      value: 5,
      percent: 100,
    });
  });

  it('aggregates multiple movements in the same category', () => {
    const movements = [
      makeMovement({ id: 'mv-1', amountCents: 300, categoryId: 'cat-1', categoryLabel: 'Comida' }),
      makeMovement({ id: 'mv-2', amountCents: 200, categoryId: 'cat-1', categoryLabel: 'Comida' }),
    ];

    const result = buildBreakdown(movements, 'category');

    expect(result).toHaveLength(1);
    expect(result[0].amountCents).toBe(500);
    expect(result[0].percent).toBe(100);
  });

  it('aggregates multiple movements in the same group', () => {
    const movements = [
      makeMovement({ id: 'mv-1', amountCents: 300, groupId: 'grp-1', groupLabel: 'Casa' }),
      makeMovement({ id: 'mv-2', amountCents: 200, groupId: 'grp-1', groupLabel: 'Casa' }),
    ];

    const result = buildBreakdown(movements, 'group');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'grp-1', label: 'Casa', amountCents: 500 });
  });

  it('computes percent-of-total across distinct categories', () => {
    const movements = [
      makeMovement({ id: 'mv-1', amountCents: 750, categoryId: 'cat-1', categoryLabel: 'Comida' }),
      makeMovement({ id: 'mv-2', amountCents: 250, categoryId: 'cat-2', categoryLabel: 'Transporte' }),
    ];

    const result = buildBreakdown(movements, 'category');
    const byId = Object.fromEntries(result.map((slice) => [slice.id, slice.percent]));

    expect(byId['cat-1']).toBe(75);
    expect(byId['cat-2']).toBe(25);
  });

  it('sorts slices by amount descending', () => {
    const movements = [
      makeMovement({ id: 'mv-1', amountCents: 100, categoryId: 'cat-small', categoryLabel: 'Small' }),
      makeMovement({ id: 'mv-2', amountCents: 900, categoryId: 'cat-big', categoryLabel: 'Big' }),
      makeMovement({ id: 'mv-3', amountCents: 500, categoryId: 'cat-mid', categoryLabel: 'Mid' }),
    ];

    const result = buildBreakdown(movements, 'category');

    expect(result.map((slice) => slice.id)).toEqual(['cat-big', 'cat-mid', 'cat-small']);
  });

  it('buckets movements with no groupId under the "Ungrouped" fallback', () => {
    const movements = [
      makeMovement({ id: 'mv-1', amountCents: 400, groupId: undefined }),
      makeMovement({ id: 'mv-2', amountCents: 100, groupId: 'grp-1', groupLabel: 'Casa' }),
    ];

    const result = buildBreakdown(movements, 'group');
    const ungrouped = result.find((slice) => slice.id === 'ungrouped');

    expect(ungrouped).toBeDefined();
    expect(ungrouped?.label).toBe('Ungrouped');
    expect(ungrouped?.amountCents).toBe(400);
  });

  it('respects the limit param', () => {
    const movements = [
      makeMovement({ id: 'mv-1', amountCents: 100, categoryId: 'cat-1', categoryLabel: 'A' }),
      makeMovement({ id: 'mv-2', amountCents: 200, categoryId: 'cat-2', categoryLabel: 'B' }),
      makeMovement({ id: 'mv-3', amountCents: 300, categoryId: 'cat-3', categoryLabel: 'C' }),
    ];

    const result = buildBreakdown(movements, 'category', 2);

    expect(result).toHaveLength(2);
    expect(result.map((slice) => slice.id)).toEqual(['cat-3', 'cat-2']);
  });
});
