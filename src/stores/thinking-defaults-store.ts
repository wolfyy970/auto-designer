/**
 * Per-task thinking (effort) overrides. The user picks an Effort name on a
 * five-position segmented control; the resolver maps it to provider-native
 * level + budget at call time. This store just persists user intent.
 *
 * The store name + STORAGE_KEYS.THINKING_DEFAULTS slot are unchanged so
 * earlier versions (v1, v2) hydrate cleanly through the migrate function.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../lib/storage-keys';
import {
  EFFORTS,
  EFFORT_TO_LEVEL,
  LEVEL_TO_EFFORT,
  THINKING_BUDGET_BY_LEVEL,
  THINKING_LEVELS,
  THINKING_TASKS,
  type Effort,
  type ThinkingLevel,
  type ThinkingTask,
} from '../lib/thinking-defaults';

export type ThinkingOverride = { effort?: Effort };
export type ThinkingOverridesByTask = Record<ThinkingTask, ThinkingOverride>;

/**
 * Project the user's effort override into the legacy wire shape that route
 * request schemas accept (`{ level, budgetTokens }`). The server resolver
 * always re-runs `resolveThinkingConfig` with the per-model capability gate,
 * so the budget here is a hint — the canonical budget table lives in
 * `config/thinking-defaults.json`.
 */
export function thinkingOverrideForWire(
  override: ThinkingOverride,
): { level?: ThinkingLevel; budgetTokens?: number } | undefined {
  if (!override?.effort) return undefined;
  const level = EFFORT_TO_LEVEL[override.effort];
  return { level, budgetTokens: THINKING_BUDGET_BY_LEVEL[level] };
}

export interface ThinkingDefaultsStore {
  overrides: ThinkingOverridesByTask;
  /** Set the user's effort preference for a task (`undefined` clears the override). */
  setEffort: (task: ThinkingTask, effort: Effort | undefined) => void;
  /** Reset one task to defaults. */
  resetTask: (task: ThinkingTask) => void;
  /** Reset every task. */
  resetAll: () => void;
}

const EMPTY_OVERRIDES: ThinkingOverridesByTask = Object.fromEntries(
  THINKING_TASKS.map((t) => [t, {}]),
) as ThinkingOverridesByTask;

function updateTask(
  state: ThinkingOverridesByTask,
  task: ThinkingTask,
  patch: ThinkingOverride,
): ThinkingOverridesByTask {
  const current = state[task] ?? {};
  const next: ThinkingOverride = { ...current, ...patch };
  if (patch.effort === undefined && 'effort' in patch) delete next.effort;
  return { ...state, [task]: next };
}

const EFFORT_SET = new Set<Effort>(EFFORTS);
const LEGACY_LEVEL_SET = new Set<string>(THINKING_LEVELS);

/**
 * Take a possibly-legacy override blob (`{ level?, budgetTokens?, effort? }`)
 * and project it onto the current `{ effort? }` shape. Unknown keys are dropped.
 */
function normalizeOverride(raw: unknown): ThinkingOverride {
  if (raw == null || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  // Prefer the new shape when present.
  if (typeof obj.effort === 'string' && EFFORT_SET.has(obj.effort as Effort)) {
    return { effort: obj.effort as Effort };
  }
  // Fall back to the legacy `level` field.
  if (typeof obj.level === 'string' && LEGACY_LEVEL_SET.has(obj.level)) {
    return { effort: LEVEL_TO_EFFORT[obj.level as keyof typeof LEVEL_TO_EFFORT] };
  }
  return {};
}

export const useThinkingDefaultsStore = create<ThinkingDefaultsStore>()(
  persist(
    (set) => ({
      overrides: EMPTY_OVERRIDES,

      setEffort: (task, effort) =>
        set((s) => ({ overrides: updateTask(s.overrides, task, { effort }) })),

      resetTask: (task) => set((s) => ({ overrides: { ...s.overrides, [task]: {} } })),

      resetAll: () => set({ overrides: EMPTY_OVERRIDES }),
    }),
    {
      name: STORAGE_KEYS.THINKING_DEFAULTS,
      version: 4,
      partialize: (s) => ({ overrides: s.overrides }),
      migrate: (persisted, fromVersion) => {
        const p = persisted as { overrides?: Partial<Record<string, unknown>> };
        const existingRaw = { ...(p.overrides ?? {}) } as Record<string, unknown>;

        // v1 → v2: split single `inputs` into three per-section slots so
        // older v2 reads still pick up tuning. v3 → v4 collapses them back.
        if (fromVersion < 2) {
          const oldInputs = existingRaw.inputs;
          if (oldInputs && typeof oldInputs === 'object' && Object.keys(oldInputs).length > 0) {
            existingRaw['inputs-research'] = existingRaw['inputs-research'] ?? oldInputs;
            existingRaw['inputs-objectives'] = existingRaw['inputs-objectives'] ?? oldInputs;
            existingRaw['inputs-constraints'] = existingRaw['inputs-constraints'] ?? oldInputs;
          }
          delete existingRaw.inputs;
        }

        // v3 → v4: collapse the three input-section slots back into one
        // `inputs` slot. Pick the most-customized (constraints first) so the
        // user's tuning carries forward.
        if (fromVersion < 4) {
          const constraints = existingRaw['inputs-constraints'];
          const objectives = existingRaw['inputs-objectives'];
          const research = existingRaw['inputs-research'];
          const isCustomized = (x: unknown) =>
            x && typeof x === 'object' && Object.keys(x).length > 0;
          const carry = isCustomized(constraints)
            ? constraints
            : isCustomized(objectives)
              ? objectives
              : isCustomized(research)
                ? research
                : undefined;
          if (carry !== undefined && existingRaw.inputs === undefined) {
            existingRaw.inputs = carry;
          }
          delete existingRaw['inputs-research'];
          delete existingRaw['inputs-objectives'];
          delete existingRaw['inputs-constraints'];
        }

        // v2 → v4: drop the `level` + `budgetTokens` shape; keep only `effort`.
        // Convert any legacy level into the matching effort. budgetTokens are
        // dropped — budgets now come from the operator-tuned table.
        const merged = { ...EMPTY_OVERRIDES } as ThinkingOverridesByTask;
        for (const t of THINKING_TASKS) {
          merged[t] = normalizeOverride(existingRaw[t]);
        }
        return { overrides: merged } as ThinkingDefaultsStore;
      },
    },
  ),
);
