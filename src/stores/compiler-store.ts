import { create } from 'zustand';
import type { CompiledPrompt, DimensionMap, VariantStrategy } from '../types/compiler';
import { DEFAULT_COMPILER_MODEL, DEFAULT_COMPILER_PROVIDER } from '../lib/constants';
import { generateId, now } from '../lib/utils';

interface CompilerStore {
  dimensionMap: DimensionMap | null;
  compiledPrompts: CompiledPrompt[];
  isCompiling: boolean;
  error: string | null;
  selectedProvider: string;
  selectedModel: string;

  setDimensionMap: (map: DimensionMap) => void;
  setCompiledPrompts: (prompts: CompiledPrompt[]) => void;
  setCompiling: (isCompiling: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;

  updateVariant: (variantId: string, updates: Partial<VariantStrategy>) => void;
  removeVariant: (variantId: string) => void;
  addVariant: () => void;
  reorderVariants: (fromIndex: number, toIndex: number) => void;
  approveMap: () => void;

  reset: () => void;
}

export const useCompilerStore = create<CompilerStore>()((set) => ({
  dimensionMap: null,
  compiledPrompts: [],
  isCompiling: false,
  error: null,
  selectedProvider: DEFAULT_COMPILER_PROVIDER,
  selectedModel: DEFAULT_COMPILER_MODEL,

  setDimensionMap: (map) => set({ dimensionMap: map, error: null }),
  setCompiledPrompts: (prompts) => set({ compiledPrompts: prompts }),
  setCompiling: (isCompiling) => set({ isCompiling }),
  setError: (error) => set({ error }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedModel: (model) => set({ selectedModel: model }),

  updateVariant: (variantId, updates) =>
    set((state) => {
      if (!state.dimensionMap) return state;
      return {
        dimensionMap: {
          ...state.dimensionMap,
          variants: state.dimensionMap.variants.map((v) =>
            v.id === variantId ? { ...v, ...updates } : v
          ),
        },
      };
    }),

  removeVariant: (variantId) =>
    set((state) => {
      if (!state.dimensionMap) return state;
      return {
        dimensionMap: {
          ...state.dimensionMap,
          variants: state.dimensionMap.variants.filter((v) => v.id !== variantId),
        },
      };
    }),

  addVariant: () =>
    set((state) => {
      if (!state.dimensionMap) return state;
      const newVariant: VariantStrategy = {
        id: generateId(),
        name: 'New Variant',
        primaryEmphasis: '',
        rationale: '',
        howItDiffers: '',
        coupledDecisions: '',
        dimensionValues: {},
      };
      return {
        dimensionMap: {
          ...state.dimensionMap,
          variants: [...state.dimensionMap.variants, newVariant],
        },
      };
    }),

  reorderVariants: (fromIndex, toIndex) =>
    set((state) => {
      if (!state.dimensionMap) return state;
      const variants = [...state.dimensionMap.variants];
      const [moved] = variants.splice(fromIndex, 1);
      variants.splice(toIndex, 0, moved);
      return {
        dimensionMap: { ...state.dimensionMap, variants },
      };
    }),

  approveMap: () =>
    set((state) => {
      if (!state.dimensionMap) return state;
      return {
        dimensionMap: { ...state.dimensionMap, approvedAt: now() },
      };
    }),

  reset: () =>
    set({
      dimensionMap: null,
      compiledPrompts: [],
      isCompiling: false,
      error: null,
    }),
}));
