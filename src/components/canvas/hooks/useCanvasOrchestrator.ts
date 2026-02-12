import { useEffect } from 'react';
import { useCompilerStore, allVariantStrategyIds } from '../../../stores/compiler-store';
import { useGenerationStore } from '../../../stores/generation-store';
import { useCanvasStore } from '../../../stores/canvas-store';

/**
 * Lightweight orchestrator: cleans up orphaned canvas nodes
 * whose backing data was removed from the compiler or generation stores.
 *
 * Node creation/sync is now driven by the nodes themselves:
 * - CompilerNode.handleCompile → syncAfterCompile
 * - GeneratorNode.handleGenerate → syncAfterGenerate
 */
export function useCanvasOrchestrator() {
  const dimensionMaps = useCompilerStore((s) => s.dimensionMaps);
  const results = useGenerationStore((s) => s.results);

  useEffect(() => {
    const { nodes, edges } = useCanvasStore.getState();
    const validStrategyIds = allVariantStrategyIds(dimensionMaps);
    const resultIds = new Set(results.map((r) => r.id));

    const orphanIds = new Set<string>();
    for (const node of nodes) {
      if (
        node.type === 'hypothesis' &&
        node.data.refId &&
        !validStrategyIds.has(node.data.refId as string)
      ) {
        orphanIds.add(node.id);
      }
      if (
        node.type === 'variant' &&
        node.data.refId &&
        !resultIds.has(node.data.refId as string)
      ) {
        orphanIds.add(node.id);
      }
    }

    if (orphanIds.size > 0) {
      useCanvasStore.setState({
        nodes: nodes.filter((n) => !orphanIds.has(n.id)),
        edges: edges.filter(
          (e) => !orphanIds.has(e.source) && !orphanIds.has(e.target)
        ),
      });
    }
  }, [dimensionMaps, results]);
}
