import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { AccountType } from '@/lib/api/accounts';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// One glyph/color per account type (for-frontend.md §5.2's closed AT01-04
// enum) — same "icon circle" visual language as movement types
// (lib/category-color.ts) and category icons, so account rows read
// consistently with the rest of the app.
const ACCOUNT_TYPE_ICON: Record<AccountType, IoniconName> = {
  AT01: 'cash-outline',
  AT02: 'business-outline',
  AT03: 'card-outline',
  AT04: 'trending-up-outline',
};

const ACCOUNT_TYPE_COLOR: Record<AccountType, string> = {
  AT01: '#4ade80', // green — cash
  AT02: '#60a5fa', // blue — débito
  AT03: '#a78bfa', // purple — crédito
  AT04: '#2dd4bf', // teal — ahorro
};

export function getAccountTypeIcon(type: AccountType): IoniconName {
  return ACCOUNT_TYPE_ICON[type];
}

export function getAccountTypeColor(type: AccountType): string {
  return ACCOUNT_TYPE_COLOR[type];
}
