import {
  buildStructuralAutoConnectEdges,
  buildValidConnectionMap,
  findMissingPrerequisiteFromContracts,
  type AutoEdge,
} from '../workspace/canvas-edge-contracts';

// Local mirror of CanvasNodeType (avoids circular import with canvas-store).
// `'model'` is retained in the union for legacy snapshots that still
// surface the type before canvas-migration v32 strips it.
type NodeType =
  | 'designBrief' | 'researchContext'
  | 'objectivesMetrics' | 'designConstraints' | 'designSystem'
  | 'incubator' | 'hypothesis' | 'preview'
  | 'model';

// ── Topology ────────────────────────────────────────────────────────

/** Valid source→target type pairs for manual edge creation */
export const VALID_CONNECTIONS: Record<NodeType, Set<NodeType>> = buildValidConnectionMap();

export function isValidConnection(sourceType: string, targetType: string): boolean {
  return (VALID_CONNECTIONS as Record<string, Set<string>>)[sourceType]?.has(targetType) ?? false;
}

// ── Prerequisite rules ──────────────────────────────────────────────

export function findMissingPrerequisite(
  _newNodeType: string,
  _existingNodes: MinimalNode[],
): string | null {
  return findMissingPrerequisiteFromContracts();
}

// ── Edge helpers ────────────────────────────────────────────────────

interface MinimalNode { id: string; type?: string }

/** Deduplicate edges by `id` (first wins). Prevents React Flow duplicate-key warnings when state merges overlap. */
export function dedupeEdgesById<T extends { id: string }>(edges: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of edges) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

// ── Auto-connect (palette / manual add) ─────────────────────────────

/**
 * Compute structural edges when a node is added from the palette
 * (inputs↔incubator and designSystem↔hypothesis).
 */
export function buildAutoConnectEdges(
  newNodeId: string,
  type: string,
  existingNodes: MinimalNode[],
): AutoEdge[] {
  return buildStructuralAutoConnectEdges(newNodeId, type, existingNodes);
}

