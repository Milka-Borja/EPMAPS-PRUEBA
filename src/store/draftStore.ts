import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DraftData = Record<string, unknown>;

interface DraftState {
  draftData: DraftData;
  isDraftActive: boolean;
  saveDraft: (data: DraftData) => void;
  clearDraft: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draftData: {},
      isDraftActive: false,
      saveDraft: (data) => set({ draftData: data, isDraftActive: true }),
      clearDraft: () => set({ draftData: {}, isDraftActive: false }),
    }),
    {
      name: 'draft-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);