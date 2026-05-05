import { EDGE_STATUS, EDGE_TYPES, INPUT_NODE_TYPES, NODE_TYPES, buildEdgeId } from '../constants/canvas';
import { dedupeEdgesById } from './canvas-connections';
import { getDesignSystemEffectiveState } from './design-md';
import type { DesignSystemNodeData } from '../types/canvas-data';
import type { DesignSpec, SpecSectionId } from '../types/spec';
import {
  NODE_TYPE_TO_SECTION,
  type CanvasNodeType,
  type WorkspaceEdge,
  type WorkspaceNode,
} from '../types/workspace-graph';

export function isProtectedIncubatorSourceEdge(
  edge: Pick<WorkspaceEdge, 'source' | 'target'>,
  nodes: readonly Pick<WorkspaceNode, 'id' | 'type'>[],
): boolean {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target || target.type !== NODE_TYPES.INCUBATOR) return false;
  return INPUT_NODE_TYPES.has(source.type) || source.type === NODE_TYPES.DESIGN_SYSTEM;
}

function sectionHasMaterial(spec: DesignSpec, sectionId: SpecSectionId): boolean {
  const section = spec.sections[sectionId];
  if (!section) return false;
  return section.content.trim().length > 0 || section.images.length > 0;
}

function sourceHasEffectiveMaterial(node: WorkspaceNode, spec: DesignSpec): boolean {
  if (INPUT_NODE_TYPES.has(node.type)) {
    const sectionId = NODE_TYPE_TO_SECTION[node.type as CanvasNodeType];
    return sectionId ? sectionHasMaterial(spec, sectionId) : false;
  }
  if (node.type === NODE_TYPES.DESIGN_SYSTEM) {
    return getDesignSystemEffectiveState((node.data ?? {}) as DesignSystemNodeData).hasEffectiveSourceInput;
  }
  return false;
}

export function repairIncubatorStructuralSourceEdges(input: {
  nodes: readonly WorkspaceNode[];
  edges: readonly WorkspaceEdge[];
  spec: DesignSpec;
}): { edges: WorkspaceEdge[]; addedEdges: WorkspaceEdge[] } {
  const incubator = input.nodes
    .filter((node) => node.type === NODE_TYPES.INCUBATOR)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!incubator) return { edges: [...input.edges], addedEdges: [] };

  const existingIds = new Set(input.edges.map((edge) => edge.id));
  const addedEdges: WorkspaceEdge[] = [];
  for (const node of input.nodes) {
    if (!sourceHasEffectiveMaterial(node, input.spec)) continue;
    if (!INPUT_NODE_TYPES.has(node.type) && node.type !== NODE_TYPES.DESIGN_SYSTEM) continue;
    const hasAnyIncubatorEdge = input.edges.some(
      (edge) => edge.source === node.id && input.nodes.some((target) => target.id === edge.target && target.type === NODE_TYPES.INCUBATOR),
    );
    if (hasAnyIncubatorEdge) continue;
    const id = buildEdgeId(node.id, incubator.id);
    if (existingIds.has(id)) continue;
    existingIds.add(id);
    addedEdges.push({
      id,
      source: node.id,
      target: incubator.id,
      type: EDGE_TYPES.DATA_FLOW,
      data: { status: EDGE_STATUS.IDLE },
    });
  }

  return {
    edges: dedupeEdgesById([...input.edges, ...addedEdges]),
    addedEdges,
  };
}
