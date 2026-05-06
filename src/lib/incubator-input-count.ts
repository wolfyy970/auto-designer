import { INPUT_NODE_TYPES, NODE_TYPES } from '../constants/canvas';
import type { DesignSpec, SpecSectionId } from '../types/spec';
import { NODE_TYPE_TO_SECTION, type CanvasNodeType } from '../types/workspace-graph';
import type { DomainIncubatorWiring } from '../types/workspace-domain';

/**
 * Minimum node/edge shape we need — matches both `WorkspaceNode` and
 * React Flow `Node` at the field level, avoiding an import cycle.
 */
interface CountableNode {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
}
interface CountableEdge {
  id?: string;
  source: string;
  target: string;
}

export interface IncubatorSpecInputSource {
  kind: 'spec-input';
  nodeId: string;
  sectionId: SpecSectionId;
  structurallyConnected: boolean;
  active: boolean;
}

export interface IncubatorPreviewSource {
  kind: 'preview';
  nodeId: string;
  structurallyConnected: true;
  active: true;
}

export interface IncubatorSourceState {
  specInputs: IncubatorSpecInputSource[];
  previews: IncubatorPreviewSource[];
  activeSpecInputNodeIds: string[];
  activePreviewNodeIds: string[];
  activeSpecSectionIds: SpecSectionId[];
  connectedSourceCount: number;
}

function sectionHasMaterial(spec: DesignSpec | undefined, sectionId: SpecSectionId): boolean {
  const section = spec?.sections[sectionId];
  if (!section) return false;
  return section.content.trim().length > 0 || section.images.length > 0;
}

function liveScopedSourceIds(
  nodes: CountableNode[],
  edges: CountableEdge[],
  incubatorId: string,
  wiring?: DomainIncubatorWiring | null,
): Set<string> {
  const liveIds = new Set(nodes.map((n) => n.id));
  const sourceIds = new Set<string>();
  for (const edge of edges) {
    if (edge.target === incubatorId && liveIds.has(edge.source)) {
      sourceIds.add(edge.source);
    }
  }
  if (wiring) {
    for (const id of wiring.inputNodeIds ?? []) if (liveIds.has(id)) sourceIds.add(id);
    for (const id of wiring.previewNodeIds ?? []) if (liveIds.has(id)) sourceIds.add(id);
  }
  return sourceIds;
}

export function resolveIncubatorSourceState(
  nodes: CountableNode[],
  edges: CountableEdge[],
  incubatorId: string,
  spec?: DesignSpec,
  wiring?: DomainIncubatorWiring | null,
): IncubatorSourceState {
  const scopedIds = liveScopedSourceIds(nodes, edges, incubatorId, wiring);
  const specInputs: IncubatorSpecInputSource[] = [];
  const previews: IncubatorPreviewSource[] = [];

  for (const node of nodes) {
    if (!node.type) continue;
    const nodeType = node.type as CanvasNodeType;
    const structurallyConnected = scopedIds.has(node.id);

    if (INPUT_NODE_TYPES.has(nodeType)) {
      const sectionId = NODE_TYPE_TO_SECTION[nodeType];
      if (!sectionId) continue;
      const active = sectionHasMaterial(spec, sectionId);
      if (structurallyConnected || active) {
        specInputs.push({
          kind: 'spec-input',
          nodeId: node.id,
          sectionId,
          structurallyConnected,
          active,
        });
      }
      continue;
    }

    if (nodeType === NODE_TYPES.PREVIEW && structurallyConnected) {
      previews.push({
        kind: 'preview',
        nodeId: node.id,
        structurallyConnected: true,
        active: true,
      });
    }
  }

  const activeSpecInputNodeIds = specInputs.filter((source) => source.active).map((source) => source.nodeId);
  const activePreviewNodeIds = previews.map((source) => source.nodeId);
  const activeSpecSectionIds = specInputs.filter((source) => source.active).map((source) => source.sectionId);

  return {
    specInputs,
    previews,
    activeSpecInputNodeIds,
    activePreviewNodeIds,
    activeSpecSectionIds,
    connectedSourceCount:
      activeSpecInputNodeIds.length + activePreviewNodeIds.length,
  };
}

/**
 * Compatibility wrapper for older callers. Prefer `resolveIncubatorSourceState`
 * when a caller needs to distinguish spec inputs and previews.
 */
export function countConnectedIncubatorInputs(
  nodes: CountableNode[],
  edges: CountableEdge[],
  incubatorId: string,
  spec?: DesignSpec,
  wiring?: DomainIncubatorWiring | null,
): number {
  return resolveIncubatorSourceState(nodes, edges, incubatorId, spec, wiring).connectedSourceCount;
}
