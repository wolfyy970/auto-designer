import { normaliseImportedSpec } from '../lib/spec-legacy';
import { NODE_TYPES } from '../constants/canvas';
import type { DesignSpec } from '../types/spec';
import type { WorkspaceEdge, WorkspaceNode } from '../types/workspace-graph';
import { snapshotClone } from './canvas-snapshot-serialization';

const LEGACY_EXISTING_DESIGN_NODE_TYPE = 'existingDesign';

/**
 * Snapshot-side spec normaliser. Round-trips the snapshot through
 * `normaliseImportedSpec` so any retired field on the persisted spec is
 * stripped before the spec lands in the active store.
 */
export function stripLegacyExistingDesignSpec(spec: DesignSpec): DesignSpec {
  return normaliseImportedSpec(snapshotClone(spec));
}

export function stripLegacyExistingDesignGraph(
  nodes: WorkspaceNode[],
  edges: WorkspaceEdge[],
): { nodes: WorkspaceNode[]; edges: WorkspaceEdge[]; removedNodeIds: Set<string> } {
  const removedNodeIds = new Set<string>();
  const nextNodes = nodes.filter((node) => {
    const nodeType = (node as { type?: string }).type;
    const targetType = typeof node.data === 'object' && node.data !== null
      ? (node.data as Record<string, unknown>).targetType
      : undefined;
    const remove =
      nodeType === LEGACY_EXISTING_DESIGN_NODE_TYPE
      || (nodeType === 'inputGhost' && targetType === LEGACY_EXISTING_DESIGN_NODE_TYPE);
    if (remove) removedNodeIds.add(node.id);
    return !remove;
  });
  const nodeTypeById = new Map(nextNodes.map((node) => [node.id, node.type]));
  const nextEdges = edges.filter((edge) => {
    if (removedNodeIds.has(edge.source) || removedNodeIds.has(edge.target)) return false;
    return !(
      nodeTypeById.get(edge.source) === NODE_TYPES.DESIGN_SYSTEM
      && nodeTypeById.get(edge.target) === NODE_TYPES.INCUBATOR
    );
  });
  return { nodes: nextNodes, edges: nextEdges, removedNodeIds };
}
