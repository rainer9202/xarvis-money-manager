import dayjs from 'dayjs';

import type { Movement } from '../lib/api/movements';
import { filterByMonth, tallyExpenseIncome } from '../lib/hooks/use-account-month-movements';

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

describe('filterByMonth', () => {
  const month = dayjs('2026-07-01');

  it('only returns movements matching the given month', () => {
    const movements = [
      makeMovement({ id: 'mv-1', date: '2026-07-10' }),
      makeMovement({ id: 'mv-2', date: '2026-06-30' }),
      makeMovement({ id: 'mv-3', date: '2026-08-01' }),
    ];

    const result = filterByMonth(movements, month);

    expect(result.map((movement) => movement.id)).toEqual(['mv-1']);
  });

  it('sorts descending by date', () => {
    const movements = [
      makeMovement({ id: 'mv-early', date: '2026-07-01', createdAt: '2026-07-01T09:00:00.000Z' }),
      makeMovement({ id: 'mv-late', date: '2026-07-20', createdAt: '2026-07-20T09:00:00.000Z' }),
      makeMovement({ id: 'mv-mid', date: '2026-07-10', createdAt: '2026-07-10T09:00:00.000Z' }),
    ];

    const result = filterByMonth(movements, month);

    expect(result.map((movement) => movement.id)).toEqual(['mv-late', 'mv-mid', 'mv-early']);
  });

  it('breaks same-day ties by createdAt descending', () => {
    const movements = [
      makeMovement({ id: 'mv-older', date: '2026-07-10', createdAt: '2026-07-10T08:00:00.000Z' }),
      makeMovement({ id: 'mv-newer', date: '2026-07-10', createdAt: '2026-07-10T12:00:00.000Z' }),
    ];

    const result = filterByMonth(movements, month);

    expect(result.map((movement) => movement.id)).toEqual(['mv-newer', 'mv-older']);
  });

  it('returns an empty array when nothing matches', () => {
    const movements = [makeMovement({ id: 'mv-1', date: '2026-01-01' })];

    expect(filterByMonth(movements, month)).toEqual([]);
  });
});

describe('tallyExpenseIncome', () => {
  it('sums MT01 as expense and MT02 as income', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT01', amountCents: 400 }),
      makeMovement({ id: 'mv-2', movementType: 'MT02', amountCents: 900 }),
    ];

    const result = tallyExpenseIncome(movements, 'acc-1');

    expect(result).toEqual({ expenseCents: 400, incomeCents: 900, balanceCents: 500 });
  });

  it('counts an outgoing transfer (accountId matches) as an expense', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT03', amountCents: 5000, accountId: 'acc-1', toAccountId: 'acc-2' }),
      makeMovement({ id: 'mv-2', movementType: 'MT01', amountCents: 100, accountId: 'acc-1' }),
    ];

    const result = tallyExpenseIncome(movements, 'acc-1');

    expect(result).toEqual({ expenseCents: 5100, incomeCents: 0, balanceCents: -5100 });
  });

  it('counts an incoming transfer (toAccountId matches) as income', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT03', amountCents: 5000, accountId: 'acc-1', toAccountId: 'acc-2' }),
    ];

    const result = tallyExpenseIncome(movements, 'acc-2');

    expect(result).toEqual({ expenseCents: 0, incomeCents: 5000, balanceCents: 5000 });
  });

  it('ignores a transfer that touches neither leg of the given account', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT03', amountCents: 5000, accountId: 'acc-2', toAccountId: 'acc-3' }),
    ];

    const result = tallyExpenseIncome(movements, 'acc-1');

    expect(result).toEqual({ expenseCents: 0, incomeCents: 0, balanceCents: 0 });
  });

  it('ignores transfers when accountId is null', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT03', amountCents: 5000, accountId: 'acc-1', toAccountId: 'acc-2' }),
      makeMovement({ id: 'mv-2', movementType: 'MT01', amountCents: 100, accountId: 'acc-1' }),
    ];

    const result = tallyExpenseIncome(movements, null);

    expect(result).toEqual({ expenseCents: 100, incomeCents: 0, balanceCents: -100 });
  });

  it('returns all zeros for an empty list', () => {
    expect(tallyExpenseIncome([], 'acc-1')).toEqual({ expenseCents: 0, incomeCents: 0, balanceCents: 0 });
  });
});
