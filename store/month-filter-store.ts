import dayjs, { type Dayjs } from 'dayjs';
import { create } from 'zustand';

// In-memory only — same reasoning as store/account-filter-store.ts (no
// SecureStore/persistence here). Shared across Home, Charts, and Reports
// (app/(app)/index.tsx, charts.tsx, reports.tsx) so navigating a month
// forward/back on any one of them keeps the other two in sync instead of
// each screen tracking its own independent month.
type MonthFilterState = {
  month: Dayjs;
  setMonth: (month: Dayjs) => void;
};

export const useMonthFilterStore = create<MonthFilterState>((set) => ({
  month: dayjs().startOf('month'),
  setMonth: (month) => set({ month }),
}));
