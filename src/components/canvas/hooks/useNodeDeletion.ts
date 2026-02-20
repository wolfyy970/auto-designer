import { useCallback, useEffect } from 'react';
import { useCanvasStore, SECTION_NODE_TYPES } from '../../stores/canvas-store';

/**
 * Hook to manage deletion of nodes in the Canvas.
 * Handles the Delete/Backspace key and protects system nodes.
 * Warns before cascading deletion of hypothesis variants.
 */
export function useNodeDeletion() {
  const nodes = useCanvasStore((s) => s.nodes);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return;
        e.preventDefault();
        
        const PROTECTED = new Set<string>([
          'compiler',
          ...SECTION_NODE_TYPES,
        ]);
        
        const removable = selected.filter(
          (n) => !PROTECTED.has(n.type as string),
        );
        if (removable.length === 0) return;

        // Warn when deleting hypotheses — variants cascade-delete
        const hypotheses = removable.filter((n) => n.type === 'hypothesis');
        if (hypotheses.length > 0) {
          const { edges: storeEdges, nodes: storeNodes } = useCanvasStore.getState();
          let variantCount = 0;
          for (const h of hypotheses) {
            for (const edge of storeEdges) {
              if (edge.source !== h.id) continue;
              if (storeNodes.find((n) => n.id === edge.target && n.type === 'variant')) {
                variantCount++;
              }
            }
          }
          const hLabel = hypotheses.length === 1 ? 'hypothesis' : 'hypotheses';
          const msg = variantCount > 0
            ? `Delete ${hypotheses.length} ${hLabel} and ${variantCount} connected ${variantCount === 1 ? 'variant' : 'variants'}?`
            : `Delete ${hypotheses.length} ${hLabel}?`;
          if (!window.confirm(msg)) return;
        }

        const removeNode = useCanvasStore.getState().removeNode;
        removable.forEach((n) => removeNode(n.id));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes]);
}
