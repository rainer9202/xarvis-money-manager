import { create } from 'zustand';

// In-memory only — no SecureStore/persistence here (unlike session-store).
// "Default to the principal account on load" should re-derive on every app
// boot rather than remembering a stale manual selection across sessions, so
// there is deliberately no persistence layer to hydrate.
type AccountFilterState = {
  /** Account the Home screen's movement list is currently filtered to, or
   * `null` before the default-selection effect has run (e.g. accounts still
   * loading, or the user has zero accounts). */
  selectedAccountId: string | null;
  setSelectedAccountId: (accountId: string | null) => void;
};

export const useAccountFilterStore = create<AccountFilterState>((set) => ({
  selectedAccountId: null,
  setSelectedAccountId: (accountId) => set({ selectedAccountId: accountId }),
}));
