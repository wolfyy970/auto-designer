import { useMemo } from 'react';
import { useCanvasStore } from '../stores/canvas-store';
import { useProviderModels } from './useProviderModels';
import { DEFAULT_COMPILER_PROVIDER } from '../lib/constants';
import type { ModelNodeData } from '../types/canvas-data';
import { NODE_TYPES } from '../constants/canvas';

/**
 * Reads provider/model config from a connected Model node.
 *
 * Traverses incoming edges to find a source node with type === 'model',
 * then reads its providerId/modelId from node data.
 *
 * Uses primitive Zustand selectors to avoid useSyncExternalStore infinite loops.
 */
export function useConnectedModel(nodeId: string) {
  // Find the connected Model node ID via incoming edges
  const modelNodeId = useCanvasStore((s) => {
    for (const e of s.edges) {
      if (e.target !== nodeId) continue;
      const source = s.nodes.find((n) => n.id === e.source);
      if (source?.type === NODE_TYPES.MODEL) return source.id;
    }
    return null;
  });

  // Read primitive values from Model node data (stable selectors).
  // Fall back to DEFAULT_COMPILER_PROVIDER when the Model node exists
  // but hasn't had its provider explicitly set yet — matches the
  // fallback in useNodeProviderModel used by ModelNode itself.
  const providerId = useCanvasStore(
    (s) => {
      if (!modelNodeId) return null;
      const data = s.nodes.find((n) => n.id === modelNodeId)?.data as ModelNodeData | undefined;
      return data?.providerId || DEFAULT_COMPILER_PROVIDER;
    },
  );

  const modelId = useCanvasStore(
    (s) => {
      if (!modelNodeId) return null;
      const data = s.nodes.find((n) => n.id === modelNodeId)?.data as ModelNodeData | undefined;
      return data?.modelId || null;
    },
  );

  const { data: models } = useProviderModels(providerId ?? '');

  const supportsVision = useMemo(
    () => models?.find((m) => m.id === modelId)?.supportsVision ?? false,
    [models, modelId],
  );

  return {
    providerId,
    modelId,
    supportsVision,
    isConnected: modelNodeId !== null,
  };
}
