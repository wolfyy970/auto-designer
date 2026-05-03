/**
 * Per-task config: model + effort. The user picks a model + effort per
 * task in Settings; the resolver maps effort to provider-native level +
 * budget at call time. This store persists user intent only — defaults
 * come from `config/task-defaults.json` and `config/thinking-defaults.json`.
 *
 * The localStorage slot name (`STORAGE_KEYS.THINKING_DEFAULTS`) is kept as
 * the historical literal so persisted user state from earlier app versions
 * hydrates cleanly through the migrate function. The exported hook was
 * renamed `useThinkingDefaultsStore → useTaskConfigStore` once the shape
 * grew beyond effort to also hold (providerId, modelId).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
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
import rawTaskDefaults from '../../config/task-defaults.json';

// ── Defaults ────────────────────────────────────────────────────────────────

const TaskDefaultsSchema = z.object({
  perTaskDefaults: z.record(
    z.string(),
    z.object({ providerId: z.string().min(1), modelId: z.string().min(1) }),
  ),
});

const TASK_DEFAULTS = TaskDefaultsSchema.parse(rawTaskDefaults).perTaskDefaults as Record<
  ThinkingTask,
  { providerId: string; modelId: string }
>;

export function getTaskModelDefault(task: ThinkingTask): { providerId: string; modelId: string } {
  return TASK_DEFAULTS[task];
}

// ── Override shape ──────────────────────────────────────────────────────────

export type ThinkingOverride = {
  effort?: Effort;
  providerId?: string;
  modelId?: string;
};
export type ThinkingOverridesByTask = Record<ThinkingTask, ThinkingOverride>;

export interface TaskConfigStore {
  overrides: ThinkingOverridesByTask;
  setEffort: (task: ThinkingTask, effort: Effort | undefined) => void;
  /** Set both providerId + modelId together (they always travel as a pair). */
  setModel: (task: ThinkingTask, providerId: string, modelId: string) => void;
  /** Clear the model override (revert to default). */
  clearModel: (task: ThinkingTask) => void;
  resetTask: (task: ThinkingTask) => void;
  resetAll: () => void;
  /** Effective model/effort for a task — defaults merged with user overrides. */
  getEffective: (task: ThinkingTask) => {
    providerId: string;
    modelId: string;
    effort: Effort;
  };
}

const EMPTY_OVERRIDES: ThinkingOverridesByTask = Object.fromEntries(
  THINKING_TASKS.map((t) => [t, {}]),
) as ThinkingOverridesByTask;

const EFFORT_SET = new Set<Effort>(EFFORTS);
const LEGACY_LEVEL_SET = new Set<string>(THINKING_LEVELS);

function normalizeOverride(raw: unknown): ThinkingOverride {
  if (raw == null || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const out: ThinkingOverride = {};
  if (typeof obj.effort === 'string' && EFFORT_SET.has(obj.effort as Effort)) {
    out.effort = obj.effort as Effort;
  } else if (typeof obj.level === 'string' && LEGACY_LEVEL_SET.has(obj.level)) {
    out.effort = LEVEL_TO_EFFORT[obj.level as ThinkingLevel];
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
  if (patch.effort === undefined && 'effort' in patch) delete next.effort;
  if (patch.providerId === undefined && 'providerId' in patch) delete next.providerId;
  if (patch.modelId === undefined && 'modelId' in patch) delete next.modelId;
  return { ...state, [task]: next };
}

/**
 * Wire-shape thinking override. The two fields always travel together:
 * if a user has set effort for a task, the resolver returns both the
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
  if (!override?.effort) return undefined;
  const level = EFFORT_TO_LEVEL[override.effort];
  return { level, budgetTokens: THINKING_BUDGET_BY_LEVEL[level] };
}

export const useTaskConfigStore = create<TaskConfigStore>()(
  persist(
    (set, get) => ({
      overrides: EMPTY_OVERRIDES,

      setEffort: (task, effort) =>
        set((s) => ({ overrides: patchTask(s.overrides, task, { effort }) })),

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
        const taskDefault = TASK_DEFAULTS[task];
        return {
          providerId: override.providerId ?? taskDefault.providerId,
          modelId: override.modelId ?? taskDefault.modelId,
          effort: override.effort ?? LEVEL_TO_EFFORT.high, // Default effort: thorough.
        };
      },
    }),
    {
      name: STORAGE_KEYS.THINKING_DEFAULTS,
      version: 4,
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

        const merged = { ...EMPTY_OVERRIDES } as ThinkingOverridesByTask;
        for (const t of THINKING_TASKS) {
          merged[t] = normalizeOverride(existingRaw[t]);
        }
        return { overrides: merged } as TaskConfigStore;
      },
    },
  ),
);
