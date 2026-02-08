import { create } from 'zustand';
import type { GenerationResult } from '../types/provider';

interface GenerationStore {
  results: GenerationResult[];
  isGenerating: boolean;

  addResult: (result: GenerationResult) => void;
  updateResult: (id: string, updates: Partial<GenerationResult>) => void;
  setGenerating: (isGenerating: boolean) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationStore>()((set) => ({
  results: [],
  isGenerating: false,

  addResult: (result) =>
    set((state) => ({ results: [...state.results, result] })),

  updateResult: (id, updates) =>
    set((state) => ({
      results: state.results.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  setGenerating: (isGenerating) => set({ isGenerating }),

  reset: () => set({ results: [], isGenerating: false }),
}));
