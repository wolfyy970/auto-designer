/**
 * Lockdown pinning, per task. Read from `config/task-defaults.json` so
 * "what production runs as" is one config edit away. Shared by client UI
 * and server enforcement — no env reads here.
 *
 * One verb: `pinForLockdown`. Overloaded for either a single
 * `(providerId, modelId)` pair or a list of credential objects. The
 * `lockdown` boolean is the gate; when off, the input is returned
 * unchanged. Call sites read the gate from `useAppConfig` (client) or
 * `isLockdownEnabled()` (server).
 */
import type { ThinkingTask } from './thinking-defaults';
import { getTaskModelDefault } from './task-defaults';

/** Returns the lockdown-pinned `(providerId, modelId)` for a task. */
export function getLockdownModelForTask(task: ThinkingTask): {
  providerId: string;
  modelId: string;
} {
  return getTaskModelDefault(task);
}

export function pinForLockdown(
  pair: { providerId: string; modelId: string },
  lockdown: boolean,
  task: ThinkingTask,
): { providerId: string; modelId: string };
export function pinForLockdown<T extends { providerId: string; modelId: string }>(
  pairs: readonly T[],
  lockdown: boolean,
  task: ThinkingTask,
): T[];
export function pinForLockdown(
  input:
    | { providerId: string; modelId: string }
    | readonly { providerId: string; modelId: string }[],
  lockdown: boolean,
  task: ThinkingTask,
): unknown {
  if (Array.isArray(input)) {
    if (!lockdown) return input.map((c) => ({ ...c }));
    const pin = getLockdownModelForTask(task);
    return input.map((c) => ({ ...c, providerId: pin.providerId, modelId: pin.modelId }));
  }
  const pair = input as { providerId: string; modelId: string };
  if (!lockdown) return { ...pair };
  return getLockdownModelForTask(task);
}
