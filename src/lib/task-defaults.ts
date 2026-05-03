/**
 * Server- and client-safe access to the per-task default `(providerId, modelId)`
 * pairs configured in `config/task-defaults.json`. The client store
 * (`task-config-store.ts`) re-exports the same helper so both sides agree.
 *
 * Lockdown clamps every LLM route to these values: in production, the
 * picker is disabled and the server enforces the same pin defensively.
 */
import { z } from 'zod';
import rawTaskDefaults from '../../config/task-defaults.json';
import type { ThinkingTask } from './thinking-defaults';

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

export function getTaskModelDefault(task: ThinkingTask): {
  providerId: string;
  modelId: string;
} {
  return TASK_DEFAULTS[task];
}
