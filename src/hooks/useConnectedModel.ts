import { useMemo } from 'react';
import { LOCKDOWN_MODEL_ID, LOCKDOWN_PROVIDER_ID } from '../lib/lockdown-model';
import { useAppConfig } from './useAppConfig';
import { useProviderModels } from './useProviderModels';
import { useThinkingDefaultsStore } from '../stores/thinking-defaults-store';
import type { ThinkingTask } from '../lib/thinking-defaults';

/**
 * Resolves provider/model + capabilities for a node from the per-task
 * Settings store. The `nodeId` is kept for symmetry with other hooks
 * that key off the canvas node, but is no longer used to look up a
 * canvas-attached model — Settings is the single source of truth.
 */
export function useConnectedModel(_nodeId: string, task: ThinkingTask) {
  const { data: appConfig } = useAppConfig();
  const lockdown = appConfig?.lockdown === true;

  const settingsProviderId = useThinkingDefaultsStore(
    (s) => s.getEffective(task).providerId,
  );
  const settingsModelId = useThinkingDefaultsStore(
    (s) => s.getEffective(task).modelId,
  );

  const resolvedProviderId = lockdown ? LOCKDOWN_PROVIDER_ID : settingsProviderId;
  const resolvedModelId = lockdown ? LOCKDOWN_MODEL_ID : settingsModelId;

  const { data: models } = useProviderModels(resolvedProviderId ?? '');

  const supportsVision = useMemo(
    () => models?.find((m) => m.id === resolvedModelId)?.supportsVision ?? false,
    [models, resolvedModelId],
  );

  const supportsReasoning = useMemo(
    () => models?.find((m) => m.id === resolvedModelId)?.supportsReasoning ?? false,
    [models, resolvedModelId],
  );

  return {
    providerId: resolvedProviderId,
    modelId: resolvedModelId,
    supportsVision,
    supportsReasoning,
    isConnected: Boolean(resolvedModelId),
  };
}
