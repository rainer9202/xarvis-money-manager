import dayjs from 'dayjs';

import { getAccountTypeColor } from '../lib/account-color';
import type { Account } from '../lib/api/accounts';
import type { Group } from '../lib/api/groups';
import type { Movement } from '../lib/api/movements';
import {
  computeAccountBalanceSlices,
  computeGroupBudgets,
  computeMonthlyAccountBalances,
  computeSavedCents,
  computeSavingsRate,
  percentChange,
  tallyMonth,
} from '../lib/reports';

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
      makeMovement({
        id: 'mv-1',
        date: '2026-07-05',
        movementType: 'MT01',
        amountCents: 500,
        accountId: 'acc-1',
      }),
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
    expect(tallyMonth([], month, 'acc-1')).toEqual({
      expenseCents: 0,
      incomeCents: 0,
      balanceCents: 0,
    });
  });
});

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Cuenta',
    type: 'AT01',
    typeLabel: 'Efectivo',
    isActive: true,
    balanceCents: 0,
    creditLimitCents: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    isPrincipal: false,
    ...overrides,
  };
}

describe('computeSavingsRate', () => {
  const accounts = [
    makeAccount({ id: 'checking', type: 'AT01' }),
    makeAccount({ id: 'savings', type: 'AT04' }),
  ];

  it('is the percentage of income transferred into an AT04 (Ahorro) account', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT02', amountCents: 1000, accountId: 'checking' }),
      makeMovement({
        id: 'mv-2',
        movementType: 'MT03',
        amountCents: 300,
        accountId: 'checking',
        toAccountId: 'savings',
      }),
    ];

    expect(computeSavingsRate(movements, accounts)).toBe(30);
  });

  it('does not count spending (MT01) as reducing income the way the old balance-based formula did', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT02', amountCents: 1000, accountId: 'checking' }),
      makeMovement({ id: 'mv-2', movementType: 'MT01', amountCents: 800, accountId: 'checking' }),
    ];

    // Spent 80% of income but saved none of it — rate is 0%, not 20%.
    expect(computeSavingsRate(movements, accounts)).toBe(0);
  });

  it('does not count a transfer to a non-savings account', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT02', amountCents: 1000, accountId: 'checking' }),
      makeMovement({
        id: 'mv-2',
        movementType: 'MT03',
        amountCents: 300,
        accountId: 'checking',
        toAccountId: 'checking',
      }),
    ];

    expect(computeSavingsRate(movements, accounts)).toBe(0);
  });

  it('returns null when there is no income (divide-by-zero guard)', () => {
    expect(computeSavingsRate([], accounts)).toBeNull();
  });

  it('rounds the result', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT02', amountCents: 300, accountId: 'checking' }),
      makeMovement({
        id: 'mv-2',
        movementType: 'MT03',
        amountCents: 100,
        accountId: 'checking',
        toAccountId: 'savings',
      }),
    ];

    // 100/300 = 33.33...%
    expect(computeSavingsRate(movements, accounts)).toBe(33);
  });
});

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-1',
    name: 'Casa',
    isActive: true,
    budgetCents: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('computeGroupBudgets', () => {
  it('sums MT01 spend against the group it is tagged with', () => {
    const groups = [makeGroup({ id: 'group-1', name: 'Casa', budgetCents: 100000 })];
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT01', amountCents: 30000, groupId: 'group-1' }),
      makeMovement({ id: 'mv-2', movementType: 'MT01', amountCents: 20000, groupId: 'group-1' }),
    ];

    expect(computeGroupBudgets(movements, groups)).toEqual([
      {
        id: 'group-1',
        name: 'Casa',
        budgetCents: 100000,
        spentCents: 50000,
        remainingCents: 50000,
      },
    ]);
  });

  it('goes negative when spend exceeds the budget', () => {
    const groups = [makeGroup({ id: 'group-1', budgetCents: 10000 })];
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT01', amountCents: 15000, groupId: 'group-1' }),
    ];

    expect(computeGroupBudgets(movements, groups)[0].remainingCents).toBe(-5000);
  });

  it('ignores movements tagged with a different group', () => {
    const groups = [makeGroup({ id: 'group-1', budgetCents: 10000 })];
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT01', amountCents: 5000, groupId: 'group-2' }),
    ];

    expect(computeGroupBudgets(movements, groups)[0].spentCents).toBe(0);
  });

  it('ignores income and transfers (MT02/MT03), only MT01 counts as spend', () => {
    const groups = [makeGroup({ id: 'group-1', budgetCents: 10000 })];
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT02', amountCents: 9000, groupId: 'group-1' }),
      makeMovement({ id: 'mv-2', movementType: 'MT03', amountCents: 9000, groupId: 'group-1' }),
    ];

    expect(computeGroupBudgets(movements, groups)[0].spentCents).toBe(0);
  });

  it('excludes groups with no budget set', () => {
    const groups = [makeGroup({ id: 'group-1', budgetCents: null })];

    expect(computeGroupBudgets([], groups)).toEqual([]);
  });

  it('excludes inactive groups even if they have a budget', () => {
    const groups = [makeGroup({ id: 'group-1', budgetCents: 10000, isActive: false })];

    expect(computeGroupBudgets([], groups)).toEqual([]);
  });
});

describe('computeSavedCents', () => {
  const accounts = [
    makeAccount({ id: 'checking', type: 'AT01' }),
    makeAccount({ id: 'savings', type: 'AT04' }),
  ];

  it('sums MT03 transfers landing on an AT04 (Ahorro) account', () => {
    const movements = [
      makeMovement({
        id: 'mv-1',
        movementType: 'MT03',
        amountCents: 300,
        accountId: 'checking',
        toAccountId: 'savings',
      }),
      makeMovement({
        id: 'mv-2',
        movementType: 'MT03',
        amountCents: 200,
        accountId: 'checking',
        toAccountId: 'savings',
      }),
    ];

    expect(computeSavedCents(movements, accounts)).toBe(500);
  });

  it('ignores a transfer to a non-savings account', () => {
    const movements = [
      makeMovement({
        id: 'mv-1',
        movementType: 'MT03',
        amountCents: 300,
        accountId: 'checking',
        toAccountId: 'checking',
      }),
    ];

    expect(computeSavedCents(movements, accounts)).toBe(0);
  });

  it('ignores expenses and income (MT01/MT02)', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT01', amountCents: 300, accountId: 'checking' }),
      makeMovement({ id: 'mv-2', movementType: 'MT02', amountCents: 300, accountId: 'checking' }),
    ];

    expect(computeSavedCents(movements, accounts)).toBe(0);
  });

  it('returns 0 for an empty list', () => {
    expect(computeSavedCents([], accounts)).toBe(0);
  });
});

describe('computeMonthlyAccountBalances', () => {
  const accounts = [
    makeAccount({ id: 'checking', name: 'Cuenta' }),
    makeAccount({ id: 'savings', name: 'Ahorro' }),
  ];

  it('nets income minus expense/transfers-out per account', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT02', amountCents: 1000, accountId: 'checking' }),
      makeMovement({ id: 'mv-2', movementType: 'MT01', amountCents: 300, accountId: 'checking' }),
    ];

    const result = computeMonthlyAccountBalances(movements, accounts);

    expect(result.accounts).toEqual([
      { id: 'checking', name: 'Cuenta', balanceCents: 700 },
      { id: 'savings', name: 'Ahorro', balanceCents: 0 },
    ]);
  });

  it("cancels a transfer between two of the user's own accounts in the total", () => {
    const movements = [
      makeMovement({
        id: 'mv-1',
        movementType: 'MT03',
        amountCents: 500,
        accountId: 'checking',
        toAccountId: 'savings',
      }),
    ];

    const result = computeMonthlyAccountBalances(movements, accounts);

    expect(result.accounts).toEqual([
      { id: 'checking', name: 'Cuenta', balanceCents: -500 },
      { id: 'savings', name: 'Ahorro', balanceCents: 500 },
    ]);
    expect(result.totalBalanceCents).toBe(0);
  });

  it('totals to net income minus expense across every account', () => {
    const movements = [
      makeMovement({ id: 'mv-1', movementType: 'MT02', amountCents: 1000, accountId: 'checking' }),
      makeMovement({ id: 'mv-2', movementType: 'MT01', amountCents: 300, accountId: 'savings' }),
    ];

    expect(computeMonthlyAccountBalances(movements, accounts).totalBalanceCents).toBe(700);
  });

  it('includes every account even with no movements this month', () => {
    const result = computeMonthlyAccountBalances([], accounts);

    expect(result).toEqual({
      accounts: [
        { id: 'checking', name: 'Cuenta', balanceCents: 0 },
        { id: 'savings', name: 'Ahorro', balanceCents: 0 },
      ],
      totalBalanceCents: 0,
    });
  });
});

describe('computeAccountBalanceSlices', () => {
  const accounts = [
    makeAccount({ id: 'checking', name: 'Cuenta', type: 'AT02' }),
    makeAccount({ id: 'savings', name: 'Ahorro', type: 'AT04' }),
    makeAccount({ id: 'credit', name: 'Tarjeta', type: 'AT03' }),
  ];

  it('turns each positive balance into a slice, in cents-to-currency-units', () => {
    const balances = [
      { id: 'checking', name: 'Cuenta', balanceCents: 150000 },
      { id: 'savings', name: 'Ahorro', balanceCents: 50000 },
    ];

    const result = computeAccountBalanceSlices(balances, accounts);

    expect(result).toEqual([
      { id: 'checking', label: 'Cuenta', value: 1500, color: expect.any(String) },
      { id: 'savings', label: 'Ahorro', value: 500, color: expect.any(String) },
    ]);
  });

  it("colors each slice by the account's type", () => {
    const balances = [
      { id: 'checking', name: 'Cuenta', balanceCents: 100 },
      { id: 'savings', name: 'Ahorro', balanceCents: 100 },
    ];

    const result = computeAccountBalanceSlices(balances, accounts);

    expect(result[0].color).toBe(getAccountTypeColor('AT02'));
    expect(result[1].color).toBe(getAccountTypeColor('AT04'));
  });

  it('excludes a negative balance (e.g. AT03 credit card debt)', () => {
    const balances = [{ id: 'credit', name: 'Tarjeta', balanceCents: -20000 }];

    expect(computeAccountBalanceSlices(balances, accounts)).toEqual([]);
  });

  it('excludes a zero balance', () => {
    const balances = [{ id: 'checking', name: 'Cuenta', balanceCents: 0 }];

    expect(computeAccountBalanceSlices(balances, accounts)).toEqual([]);
  });

  it('returns an empty array for no accounts', () => {
    expect(computeAccountBalanceSlices([], [])).toEqual([]);
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
