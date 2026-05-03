import { useMemo } from 'react';
import { useCanvasStore } from '../stores/canvas-store';
import { useWorkspaceDomainStore } from '../stores/workspace-domain-store';
import { LOCKDOWN_MODEL_ID, LOCKDOWN_PROVIDER_ID } from '../lib/lockdown-model';
import { useAppConfig } from './useAppConfig';
import { useProviderModels } from './useProviderModels';
import { DEFAULT_INCUBATOR_PROVIDER } from '../lib/constants';
import { getModelNodeData } from '../lib/canvas-node-data';
import { findFirstUpstreamModelNodeId } from '../workspace/graph-queries';
import { useThinkingDefaultsStore } from '../stores/thinking-defaults-store';
import type { ThinkingTask } from '../lib/thinking-defaults';

/**
 * Resolves provider/model for a node.
 *
 * Priority: domain binding (incubator/hypothesis) → upstream graph edge →
 * per-task Settings store. Lockdown clamps the final result.
 */
export function useConnectedModel(nodeId: string, task: ThinkingTask) {
  const { data: appConfig } = useAppConfig();
  const lockdown = appConfig?.lockdown === true;

  const domainModelNodeId = useWorkspaceDomainStore((s) => {
    const fromIncubator = s.incubatorModelNodeIds[nodeId]?.[0];
    if (fromIncubator) return fromIncubator;
    return s.hypotheses[nodeId]?.modelNodeIds[0] ?? null;
  });

  const graphModelNodeId = useCanvasStore((s) =>
    findFirstUpstreamModelNodeId(nodeId, { nodes: s.nodes, edges: s.edges }),
  );

  const modelNodeId = domainModelNodeId ?? graphModelNodeId;

  const canvasProviderId = useCanvasStore((s) => {
    if (!modelNodeId) return null;
    const data = getModelNodeData(s.nodes.find((n) => n.id === modelNodeId));
    return data?.providerId || DEFAULT_INCUBATOR_PROVIDER;
  });

  const canvasModelId = useCanvasStore((s) => {
    if (!modelNodeId) return null;
    const data = getModelNodeData(s.nodes.find((n) => n.id === modelNodeId));
    return data?.modelId || null;
  });

  const settingsProviderId = useThinkingDefaultsStore(
    (s) => s.getEffective(task).providerId,
  );
  const settingsModelId = useThinkingDefaultsStore(
    (s) => s.getEffective(task).modelId,
  );

  const fromCanvas = Boolean(modelNodeId && canvasModelId);
  const baseProviderId = fromCanvas ? canvasProviderId : settingsProviderId;
  const baseModelId = fromCanvas ? canvasModelId : settingsModelId;

  const resolvedProviderId = lockdown
    ? LOCKDOWN_PROVIDER_ID
    : baseProviderId;
  const resolvedModelId = lockdown ? LOCKDOWN_MODEL_ID : baseModelId;

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
