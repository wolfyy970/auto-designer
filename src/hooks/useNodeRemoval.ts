import { useCallback } from 'react';
import { useCanvasStore } from '../stores/canvas-store';

/** Returns a stable callback that removes the given node from the canvas. */
export function useNodeRemoval(nodeId: string): () => void {
  const removeNode = useCanvasStore((s) => s.removeNode);
  return useCallback(() => removeNode(nodeId), [removeNode, nodeId]);
}
