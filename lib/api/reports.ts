import { apiClient } from './client';

export type AccountBalance = {
  id: string;
  name: string;
  balanceCents: number;
};

export type BalanceReport = {
  accounts: AccountBalance[];
  totalBalanceCents: number;
};

export function getBalanceReport() {
  return apiClient.get<BalanceReport>('/reports/balance');
}
