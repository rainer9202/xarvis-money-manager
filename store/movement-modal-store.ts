import { create } from 'zustand';

// In-memory only, matching account-filter-store.ts's pattern. Creating a new
// movement is its own page now (app/add-movement.tsx), not part of this
// sheet — `movementId` being non-null IS "open" for viewing/editing an
// existing one, no separate boolean needed.
type MovementModalState = {
  movementId: string | null;
  openView: (movementId: string) => void;
  close: () => void;
};

export const useMovementModalStore = create<MovementModalState>((set) => ({
  movementId: null,
  openView: (movementId) => set({ movementId }),
  close: () => set({ movementId: null }),
}));
