import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompiledPrompt, DimensionMap, VariantStrategy } from '../types/compiler';
import { DEFAULT_COMPILER_PROVIDER } from '../lib/constants';
import { generateId, now } from '../lib/utils';

// ── Selector helpers (for callers that need a single map) ──────────

/** Find a variant strategy by ID across all dimension maps */
export function findVariantStrategy(
  dimensionMaps: Record<string, DimensionMap>,
  variantId: string
): VariantStrategy | undefined {
  for (const map of Object.values(dimensionMaps)) {
    const found = map.variants.find((v) => v.id === variantId);
    if (found) return found;
  }
  return undefined;
}

/** Get all variant strategy IDs across all dimension maps */
export function allVariantStrategyIds(
  dimensionMaps: Record<string, DimensionMap>
): Set<string> {
  const ids = new Set<string>();
  for (const map of Object.values(dimensionMaps)) {
    for (const v of map.variants) ids.add(v.id);
  }
  return ids;
}

/** Selector: returns the most recently added dimension map (backward compat) */
export function selectDimensionMap(s: CompilerStore): DimensionMap | null {
  const maps = Object.values(s.dimensionMaps);
  return maps.length > 0 ? maps[maps.length - 1] : null;
}

// ── Store interface ────────────────────────────────────────────────

interface CompilerStore {
  /** All dimension maps keyed by compiler node ID */
  dimensionMaps: Record<string, DimensionMap>;
  compiledPrompts: CompiledPrompt[];
  isCompiling: boolean;
  error: string | null;
  /** Default provider/model for non-canvas views */
  selectedProvider: string;
  selectedModel: string;

  setDimensionMapForNode: (nodeId: string, map: DimensionMap) => void;
  removeDimensionMapForNode: (nodeId: string) => void;
  setCompiledPrompts: (prompts: CompiledPrompt[]) => void;
  setCompiling: (isCompiling: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;

  updateVariant: (variantId: string, updates: Partial<VariantStrategy>) => void;
  removeVariant: (variantId: string) => void;
  addVariantToNode: (nodeId: string) => void;
  approveMapForNode: (nodeId: string) => void;

  reset: () => void;
}

// CompilerStore interface used internally only

// ── Store implementation ────────────────────────────────────────────

export const useCompilerStore = create<CompilerStore>()(
  persist(
    (set) => ({
      dimensionMaps: {},
      compiledPrompts: [],
      isCompiling: false,
      error: null,
      selectedProvider: DEFAULT_COMPILER_PROVIDER,
      selectedModel: '',

      setDimensionMapForNode: (nodeId, map) =>
        set((state) => ({
          dimensionMaps: { ...state.dimensionMaps, [nodeId]: map },
          error: null,
        })),

      removeDimensionMapForNode: (nodeId) =>
        set((state) => {
          const { [nodeId]: _, ...rest } = state.dimensionMaps;
          return { dimensionMaps: rest };
        }),

      setCompiledPrompts: (prompts) => set({ compiledPrompts: prompts }),
      setCompiling: (isCompiling) => set({ isCompiling }),
      setError: (error) => set({ error }),
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      setSelectedModel: (model) => set({ selectedModel: model }),

      updateVariant: (variantId, updates) =>
        set((state) => {
          const updatedMaps = { ...state.dimensionMaps };
          for (const [nodeId, map] of Object.entries(updatedMaps)) {
            const idx = map.variants.findIndex((v) => v.id === variantId);
            if (idx !== -1) {
              updatedMaps[nodeId] = {
                ...map,
                variants: map.variants.map((v) =>
                  v.id === variantId ? { ...v, ...updates } : v
                ),
              };
              break;
            }
          }
          return { dimensionMaps: updatedMaps };
        }),

      removeVariant: (variantId) =>
        set((state) => {
          const updatedMaps = { ...state.dimensionMaps };
          for (const [nodeId, map] of Object.entries(updatedMaps)) {
            const idx = map.variants.findIndex((v) => v.id === variantId);
            if (idx !== -1) {
              updatedMaps[nodeId] = {
                ...map,
                variants: map.variants.filter((v) => v.id !== variantId),
              };
              break;
            }
          }
          return { dimensionMaps: updatedMaps };
        }),

      addVariantToNode: (nodeId) =>
        set((state) => {
          const map = state.dimensionMaps[nodeId];
          if (!map) return state;
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
            dimensionMaps: {
              ...state.dimensionMaps,
              [nodeId]: {
                ...map,
                variants: [...map.variants, newVariant],
              },
            },
          };
        }),

      approveMapForNode: (nodeId) =>
        set((state) => {
          const map = state.dimensionMaps[nodeId];
          if (!map) return state;
          return {
            dimensionMaps: {
              ...state.dimensionMaps,
              [nodeId]: { ...map, approvedAt: now() },
            },
          };
        }),

      reset: () =>
        set({
          dimensionMaps: {},
          compiledPrompts: [],
          isCompiling: false,
          error: null,
        }),
    }),
    {
      name: 'auto-designer-compiler',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 1) {
          // Migrate from single dimensionMap to dimensionMaps record
          const old = persistedState as Record<string, unknown>;
          const dimensionMaps: Record<string, DimensionMap> = {};
          if (old.dimensionMap) {
            dimensionMaps['compiler-node'] = old.dimensionMap as DimensionMap;
          }
          return {
            ...old,
            dimensionMaps,
          };
        }
        return persistedState as Record<string, unknown>;
      },
      partialize: (state) => ({
        dimensionMaps: state.dimensionMaps,
        // compiledPrompts excluded — transient, regenerated each compile/generate
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
