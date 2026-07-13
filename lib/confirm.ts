import { useConfirmModalStore } from '@/store/confirm-modal-store';

/**
 * Destructive-action confirm — opens the app's own dark-themed sheet
 * (components/confirm-modal.tsx, mounted once at the root layout) instead
 * of `Alert.alert` (a documented no-op on react-native-web) or
 * `window.confirm` (browser-native styling, doesn't match the app). Same
 * call signature everywhere: title, message, and what to run on confirm.
 */
export function confirmDestructive(title: string, message: string, onConfirm: () => void): void {
  useConfirmModalStore.getState().open(title, message, onConfirm);
}
