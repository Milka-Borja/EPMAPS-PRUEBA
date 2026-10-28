import { create } from 'zustand';

interface SyncState {
  isConnected: boolean;
  pendingCount: number;
  syncRequestId: number;
  setIsConnected: (isConnected: boolean) => void;
  setPendingCount: (pendingCount: number) => void;
  requestSync: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isConnected: false,
  pendingCount: 0,
  syncRequestId: 0,
  setIsConnected: (isConnected) => set({ isConnected }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  requestSync: () =>
    set((state) => ({ syncRequestId: state.syncRequestId + 1 })),
}));