/**
 * Hydrate workspace domain from a canvas node/edge snapshot (load / layout).
 * Lives outside `workspace-domain-store` so the domain module stays free of canvas wiring rules.
 */
import { NODE_TYPES } from '../constants/canvas';
import { getDesignSystemNodeData } from '../lib/canvas-node-data';
import { designSystemSourceFromNodeData, getDesignSystemSourceMode } from '../lib/design-md';
import type { CanvasNodeType } from '../types/workspace-graph';
import { useWorkspaceDomainStore } from '../stores/workspace-domain-store';
import { applyHydrateEdgeRules } from './edge-domain-rules';
import { snapshotNodeToWorkspace } from './graph-queries';

/** Hydrate domain from an existing canvas snapshot (best-effort, idempotent). */
export function hydrateDomainFromCanvasGraph(input: {
  nodes: { id: string; type: CanvasNodeType; data: Record<string, unknown> }[];
  edges: { source: string; target: string }[];
}): void {
  const store = useWorkspaceDomainStore.getState();

  for (const n of input.nodes) {
    if (n.type === NODE_TYPES.DESIGN_SYSTEM) {
      const d = getDesignSystemNodeData(snapshotNodeToWorkspace(n));
      if (d) {
        const source = designSystemSourceFromNodeData(d);
        store.upsertDesignSystem(n.id, {
          title: source.title ?? d.title ?? '',
          content: source.content ?? '',
          sourceMode: getDesignSystemSourceMode(d),
          images: [...(source.images ?? [])],
          markdownSources: [...(source.markdownSources ?? [])],
          designMdDocument: d.designMdDocument,
          providerMigration: d.providerId,
          modelMigration: d.modelId,
        });
      }
    }
  }

  const compilerHypFirst = (e: { source: string; target: string }) => {
    const src = input.nodes.find((node) => node.id === e.source);
    const tgt = input.nodes.find((node) => node.id === e.target);
    return src?.type === NODE_TYPES.INCUBATOR && tgt?.type === NODE_TYPES.HYPOTHESIS;
  };
  const orderedEdges = [
    ...input.edges.filter(compilerHypFirst),
    ...input.edges.filter((e) => !compilerHypFirst(e)),
  ];

  for (const e of orderedEdges) {
    const src = input.nodes.find((node) => node.id === e.source);
    const tgt = input.nodes.find((node) => node.id === e.target);
    if (!src || !tgt) continue;

    applyHydrateEdgeRules({ store, input, src, tgt });
  }
}
