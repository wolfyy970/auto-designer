/**
 * Lockdown pinning, per task. Read from `config/task-defaults.json` so
 * "what production runs as" is one config edit away. Shared by client UI
 * and server enforcement — no env reads here.
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

/** Clamp every credential lane to the task's lockdown pin when active. */
export function pinModelCredentialsIfLockdown<
  T extends { providerId: string; modelId: string },
>(creds: readonly T[], lockdown: boolean, task: ThinkingTask): T[] {
  if (!lockdown) return creds.map((c) => ({ ...c }));
  const pin = getLockdownModelForTask(task);
  return creds.map((c) => ({
    ...c,
    providerId: pin.providerId,
    modelId: pin.modelId,
  }));
}
