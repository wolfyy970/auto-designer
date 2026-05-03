import { useMemo } from 'react';
import { getLockdownModelForTask } from '../lib/lockdown-model';
import { useAppConfig } from './useAppConfig';
import { useProviderModels } from './useProviderModels';
import { useTaskConfigStore } from '../stores/task-config-store';
import type { ThinkingTask } from '../lib/thinking-defaults';

export interface TaskModel {
  providerId: string | null;
  modelId: string | null;
  hasModel: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

/**
 * Resolves provider/model + capabilities for a task from the per-task
 * Settings store. Lockdown clamps the result to the task's pin from
 * `config/task-defaults.json`. Replaces the legacy `useFirstCanvasModel`
 * and `useConnectedModel` hooks; the canvas Model node was removed in
 * Phase 7 D.
 */
export function useTaskModel(task: ThinkingTask): TaskModel {
  const { data: appConfig } = useAppConfig();
  const lockdown = appConfig?.lockdown === true;

  const settingsProviderId = useTaskConfigStore(
    (s) => s.getEffective(task).providerId,
  );
  const settingsModelId = useTaskConfigStore(
    (s) => s.getEffective(task).modelId,
  );

  const lockdownPin = lockdown ? getLockdownModelForTask(task) : null;
  const providerId = lockdownPin?.providerId ?? settingsProviderId;
  const modelId = lockdownPin?.modelId ?? settingsModelId;

  const { data: models } = useProviderModels(providerId ?? '');

  const supportsVision = useMemo(
    () => models?.find((m) => m.id === modelId)?.supportsVision ?? false,
    [models, modelId],
  );
  const supportsReasoning = useMemo(
    () => models?.find((m) => m.id === modelId)?.supportsReasoning ?? false,
    [models, modelId],
  );

  return {
    providerId,
    modelId,
    hasModel: Boolean(modelId),
    supportsVision,
    supportsReasoning,
  };
}
