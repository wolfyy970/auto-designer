/**
 * Per-task config: model + thinking level. The user picks both per task in
 * Settings; the store persists user intent only — defaults come from
 * `config/task-defaults.json` and `config/thinking-defaults.json`.
 *
 * The localStorage slot name (`STORAGE_KEYS.THINKING_DEFAULTS`) is kept as
 * the historical literal so persisted user state from earlier app versions
 * hydrates cleanly through the migrate function. The persist `version: 5`
 * migration collapses the prior `effort` taxonomy into the SDK-native
 * `level` taxonomy (single vocabulary across UI, store, and wire).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../lib/storage-keys';
import {
  THINKING_BUDGET_BY_LEVEL,
  THINKING_TASKS,
  UI_LEVELS,
  type ThinkingLevel,
  type ThinkingTask,
  type UiLevel,
} from '../lib/thinking-defaults';
import { getTaskModelDefault } from '../lib/task-defaults';

// ── Override shape ──────────────────────────────────────────────────────────

export type ThinkingOverride = {
  level?: UiLevel;
  providerId?: string;
  modelId?: string;
};
export type ThinkingOverridesByTask = Record<ThinkingTask, ThinkingOverride>;

export interface TaskConfigStore {
  overrides: ThinkingOverridesByTask;
  setLevel: (task: ThinkingTask, level: UiLevel | undefined) => void;
  /** Set both providerId + modelId together (they always travel as a pair). */
  setModel: (task: ThinkingTask, providerId: string, modelId: string) => void;
  /** Clear the model override (revert to default). */
  clearModel: (task: ThinkingTask) => void;
  resetTask: (task: ThinkingTask) => void;
  resetAll: () => void;
  /** Effective model + level for a task — defaults merged with user overrides. */
  getEffective: (task: ThinkingTask) => {
    providerId: string;
    modelId: string;
    level: UiLevel;
  };
}

const EMPTY_OVERRIDES: ThinkingOverridesByTask = Object.fromEntries(
  THINKING_TASKS.map((t) => [t, {}]),
) as ThinkingOverridesByTask;

const UI_LEVEL_SET = new Set<string>(UI_LEVELS);

/** Effort → level rename, used during the v4 → v5 persist migration. */
const LEGACY_EFFORT_TO_LEVEL: Record<string, UiLevel> = {
  off: 'off',
  quick: 'low',
  balanced: 'medium',
  thorough: 'high',
  maximum: 'xhigh',
};

function normalizeOverride(raw: unknown): ThinkingOverride {
  if (raw == null || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const out: ThinkingOverride = {};
  if (typeof obj.level === 'string' && UI_LEVEL_SET.has(obj.level)) {
    out.level = obj.level as UiLevel;
  } else if (typeof obj.level === 'string' && obj.level === 'minimal') {
    // SDK-native 'minimal' collapses to UI-visible 'low'.
    out.level = 'low';
  } else if (typeof obj.effort === 'string' && obj.effort in LEGACY_EFFORT_TO_LEVEL) {
    out.level = LEGACY_EFFORT_TO_LEVEL[obj.effort]!;
  }
  if (typeof obj.providerId === 'string' && obj.providerId.length > 0) {
    out.providerId = obj.providerId;
  }
  if (typeof obj.modelId === 'string' && obj.modelId.length > 0) {
    out.modelId = obj.modelId;
  }
  return out;
}

function patchTask(
  state: ThinkingOverridesByTask,
  task: ThinkingTask,
  patch: ThinkingOverride,
): ThinkingOverridesByTask {
  const current = state[task] ?? {};
  const next: ThinkingOverride = { ...current, ...patch };
  if (patch.level === undefined && 'level' in patch) delete next.level;
  if (patch.providerId === undefined && 'providerId' in patch) delete next.providerId;
  if (patch.modelId === undefined && 'modelId' in patch) delete next.modelId;
  return { ...state, [task]: next };
}

/**
 * Wire-shape thinking override. The two fields always travel together:
 * if a user has set a level for a task, the resolver returns both the
 * SDK-native level and its budget. `undefined` means "no override —
 * the server picks defaults for this task." The narrower types stop
 * call sites from accidentally constructing a half-populated override.
 */
export interface WireThinkingOverride {
  level: ThinkingLevel;
  budgetTokens: number;
}

export function thinkingOverrideForWire(
  override: ThinkingOverride | undefined,
): WireThinkingOverride | undefined {
  if (!override?.level) return undefined;
  return { level: override.level, budgetTokens: THINKING_BUDGET_BY_LEVEL[override.level] };
}

export const useTaskConfigStore = create<TaskConfigStore>()(
  persist(
    (set, get) => ({
      overrides: EMPTY_OVERRIDES,

      setLevel: (task, level) =>
        set((s) => ({ overrides: patchTask(s.overrides, task, { level }) })),

      setModel: (task, providerId, modelId) =>
        set((s) => ({ overrides: patchTask(s.overrides, task, { providerId, modelId }) })),

      clearModel: (task) =>
        set((s) => ({
          overrides: patchTask(s.overrides, task, { providerId: undefined, modelId: undefined }),
        })),

      resetTask: (task) => set((s) => ({ overrides: { ...s.overrides, [task]: {} } })),

      resetAll: () => set({ overrides: EMPTY_OVERRIDES }),

      getEffective: (task) => {
        const override = get().overrides[task] ?? {};
        const taskDefault = getTaskModelDefault(task);
        return {
          providerId: override.providerId ?? taskDefault.providerId,
          modelId: override.modelId ?? taskDefault.modelId,
          level: override.level ?? 'high', // Default UI level: High (= old "thorough").
        };
      },
    }),
    {
      name: STORAGE_KEYS.THINKING_DEFAULTS,
      version: 6,
      partialize: (s) => ({ overrides: s.overrides }),
      migrate: (persisted, fromVersion) => {
        const p = persisted as { overrides?: Partial<Record<string, unknown>> };
        const existingRaw = { ...(p.overrides ?? {}) } as Record<string, unknown>;

        if (fromVersion < 2) {
          const oldInputs = existingRaw.inputs;
          if (oldInputs && typeof oldInputs === 'object' && Object.keys(oldInputs).length > 0) {
            existingRaw['inputs-research'] = existingRaw['inputs-research'] ?? oldInputs;
            existingRaw['inputs-objectives'] = existingRaw['inputs-objectives'] ?? oldInputs;
            existingRaw['inputs-constraints'] = existingRaw['inputs-constraints'] ?? oldInputs;
          }
          delete existingRaw.inputs;
        }

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

        // v4 → v5 collapse: rename `effort` to `level` per task. normalizeOverride
        // handles the per-task migration as part of its normal parsing path.

        if (fromVersion < 6) {
          // v5 → v6: drop the persisted 'internal-context' slot — the task is gone.
          delete existingRaw['internal-context'];
        }

        const merged = { ...EMPTY_OVERRIDES } as ThinkingOverridesByTask;
        for (const t of THINKING_TASKS) {
          merged[t] = normalizeOverride(existingRaw[t]);
        }
        return { overrides: merged } as TaskConfigStore;
      },
    },
  ),
);
