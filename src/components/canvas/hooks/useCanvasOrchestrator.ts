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
 * - HypothesisNode.handleGenerate → syncAfterGenerate
 */
export function useCanvasOrchestrator() {
  const dimensionMaps = useCompilerStore((s) => s.dimensionMaps);
  const results = useGenerationStore((s) => s.results);

  useEffect(() => {
    const { nodes, edges } = useCanvasStore.getState();
    const validStrategyIds = allVariantStrategyIds(dimensionMaps);
    // For variant orphan detection, check if ANY result exists for the
    // hypothesis (variantStrategyId), not just the specific refId.
    // With version stacking, refId points to the active result which can
    // change or be deleted while other versions still exist.
    const resultVsIds = new Set(results.map((r) => r.variantStrategyId));

    const orphanIds = new Set<string>();
    for (const node of nodes) {
      if (
        node.type === 'hypothesis' &&
        node.data.refId &&
        !validStrategyIds.has(node.data.refId as string)
      ) {
        orphanIds.add(node.id);
      }
      // Skip archived (pinned) variants — they should never be auto-deleted
      if (
        node.type === 'variant' &&
        !node.data.pinnedRunId &&
        node.data.variantStrategyId &&
        !resultVsIds.has(node.data.variantStrategyId as string)
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

    // Clean stale "generating" results left over from a previous session.
    // Only when not actively generating — isGenerating is NOT persisted,
    // so it defaults to false on page load (catches stale results) but
    // is true during active generation (prevents false "interrupted" errors).
    if (!useGenerationStore.getState().isGenerating) {
      for (const r of results) {
        if (r.status === 'generating') {
          useGenerationStore.getState().updateResult(r.id, {
            status: 'error',
            error: 'Generation interrupted by page reload',
          });
        }
      }
    }
  }, [dimensionMaps, results]);
}
