import { useMemo } from 'react';
import { useCanvasStore } from '../stores/canvas-store';
import { NODE_TYPES } from '../constants/canvas';
import { getModelNodeData } from '../lib/canvas-node-data';
import { DEFAULT_INCUBATOR_PROVIDER } from '../lib/constants';
import {
  LOCKDOWN_MODEL_ID,
  LOCKDOWN_PROVIDER_ID,
} from '../lib/lockdown-model';
import { useAppConfig } from './useAppConfig';
import { useThinkingDefaultsStore } from '../stores/thinking-defaults-store';
import type { ThinkingTask } from '../lib/thinking-defaults';

const PACK = '';

/**
 * Resolves a model for the given task: the first canvas Model node wins,
 * otherwise the per-task Settings store. Lockdown clamps both.
 */
export function useFirstCanvasModel(task: ThinkingTask) {
  const { data: appConfig } = useAppConfig();
  const lockdown = appConfig?.lockdown === true;

  const packed = useCanvasStore((s) => {
    const m = s.nodes.find((n) => n.type === NODE_TYPES.MODEL);
    if (!m) return '';
    const d = getModelNodeData(m);
    const pid = (d?.providerId?.trim() || DEFAULT_INCUBATOR_PROVIDER).trim();
    const mid = (d?.modelId ?? '').trim();
    if (!mid) return '';
    return `${pid}${PACK}${mid}`;
  });

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
    if (packed) {
      const i = packed.indexOf(PACK);
      if (i >= 0) {
        return {
          providerId: packed.slice(0, i),
          modelId: packed.slice(i + PACK.length),
          hasModel: true,
        };
      }
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
  }, [packed, lockdown, settingsProviderId, settingsModelId]);
}
