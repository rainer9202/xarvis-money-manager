import { create } from 'zustand';

// In-memory only, matching the other UI-state stores in this app
// (account-filter-store.ts, movement-modal-store.ts). A single global
// confirm dialog, opened imperatively via lib/confirm.ts's
// `confirmDestructive` — mirrors the old Alert.alert call-site shape so no
// call site needs to change when the implementation swaps.
type ConfirmModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  open: (title: string, message: string, onConfirm: () => void) => void;
  close: () => void;
};

export const useConfirmModalStore = create<ConfirmModalState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: null,
  open: (title, message, onConfirm) => set({ isOpen: true, title, message, onConfirm }),
  close: () => set({ isOpen: false, onConfirm: null }),
}));
