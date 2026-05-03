import { useMemo } from 'react';
import {
  LOCKDOWN_MODEL_ID,
  LOCKDOWN_PROVIDER_ID,
} from '../lib/lockdown-model';
import { useAppConfig } from './useAppConfig';
import { useThinkingDefaultsStore } from '../stores/thinking-defaults-store';
import type { ThinkingTask } from '../lib/thinking-defaults';

/**
 * Resolves the model for a task from the per-task Settings store.
 * Lockdown clamps the result. Canvas Model nodes are no longer
 * consulted — Stage 2 migrated their selections into Settings.
 */
export function useFirstCanvasModel(task: ThinkingTask) {
  const { data: appConfig } = useAppConfig();
  const lockdown = appConfig?.lockdown === true;

  const settingsProviderId = useThinkingDefaultsStore(
    (s) => s.getEffective(task).providerId,
  );
  const settingsModelId = useThinkingDefaultsStore(
    (s) => s.getEffective(task).modelId,
  );

  return useMemo(() => {
    if (lockdown) {
      return {
        providerId: LOCKDOWN_PROVIDER_ID,
        modelId: LOCKDOWN_MODEL_ID,
        hasModel: true,
      };
    }
    if (settingsProviderId && settingsModelId) {
      return {
        providerId: settingsProviderId,
        modelId: settingsModelId,
        hasModel: true,
      };
    }
    return {
      providerId: null as string | null,
      modelId: null as string | null,
      hasModel: false,
    };
  }, [lockdown, settingsProviderId, settingsModelId]);
}
