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
import { THINKING_TASKS, type ThinkingTask } from './thinking-defaults';

export const TaskModelDefaultSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
});

export const TaskDefaultsFileSchema = z
  .object({
    perTaskDefaults: z.record(z.string(), TaskModelDefaultSchema),
  })
  .strict();

const parsedTaskDefaults = TaskDefaultsFileSchema.parse(rawTaskDefaults);

for (const task of THINKING_TASKS) {
  if (!parsedTaskDefaults.perTaskDefaults[task]) {
    throw new Error(`config/task-defaults.json missing perTaskDefaults.${task}`);
  }
}

const TASK_DEFAULTS = parsedTaskDefaults.perTaskDefaults as Record<
  ThinkingTask,
  z.infer<typeof TaskModelDefaultSchema>
>;

export type TaskModelDefault = z.infer<typeof TaskModelDefaultSchema>;

export const DEFAULT_LEGACY_MODEL_TASK: ThinkingTask = 'incubate';

export function getTaskModelDefault(task: ThinkingTask): TaskModelDefault {
  return TASK_DEFAULTS[task];
}
