// Local mirror of CanvasNodeType (avoids circular import with canvas-store)
type NodeType =
  | 'designBrief' | 'existingDesign' | 'researchContext'
  | 'objectivesMetrics' | 'designConstraints' | 'designSystem'
  | 'compiler' | 'hypothesis' | 'variant' | 'critique'
  | 'model';

/** Valid source→target type pairs for manual edge creation */
export const VALID_CONNECTIONS: Record<NodeType, Set<NodeType>> = {
  designBrief: new Set(['compiler']),
  existingDesign: new Set(['compiler']),
  researchContext: new Set(['compiler']),
  objectivesMetrics: new Set(['compiler']),
  designConstraints: new Set(['compiler']),
  designSystem: new Set(['hypothesis']),
  compiler: new Set(['hypothesis']),
  hypothesis: new Set(['variant']),
  variant: new Set(['compiler', 'existingDesign', 'critique']),
  critique: new Set(['compiler']),
  model: new Set(['compiler', 'hypothesis', 'designSystem']),
};

export function isValidConnection(sourceType: string, targetType: string): boolean {
  return (VALID_CONNECTIONS as Record<string, Set<string>>)[sourceType]?.has(targetType) ?? false;
}

// ── Auto-connect edge builder ───────────────────────────────────────

interface MinimalNode { id: string; type?: string }
interface AutoEdge { id: string; source: string; target: string; type: 'dataFlow'; data: { status: 'idle' } }

const SECTION_TYPES = new Set([
  'designBrief', 'existingDesign', 'researchContext',
  'objectivesMetrics', 'designConstraints',
]);

function makeEdge(source: string, target: string): AutoEdge {
  return { id: `edge-${source}-to-${target}`, source, target, type: 'dataFlow', data: { status: 'idle' } };
}

/**
 * Compute edges to auto-create when a new node is added to the canvas.
 * Pure function — no store access.
 */
export function buildAutoConnectEdges(
  newNodeId: string,
  type: string,
  existingNodes: MinimalNode[],
): AutoEdge[] {
  const edges: AutoEdge[] = [];

  // section → compiler (if exactly one compiler exists)
  if (SECTION_TYPES.has(type)) {
    const compilers = existingNodes.filter((n) => n.type === 'compiler');
    if (compilers.length === 1) {
      edges.push(makeEdge(newNodeId, compilers[0].id));
    }
  }

  // all sections → new compiler (if it's the first compiler)
  if (type === 'compiler') {
    const existingCompilers = existingNodes.filter((n) => n.type === 'compiler');
    if (existingCompilers.length === 0) {
      for (const sn of existingNodes.filter((n) => SECTION_TYPES.has(n.type ?? ''))) {
        edges.push(makeEdge(sn.id, newNodeId));
      }
    }
  }

  // designSystem → all existing hypotheses
  if (type === 'designSystem') {
    for (const hyp of existingNodes.filter((n) => n.type === 'hypothesis')) {
      edges.push(makeEdge(newNodeId, hyp.id));
    }
  }

  // all existing designSystems → new hypothesis
  if (type === 'hypothesis') {
    for (const ds of existingNodes.filter((n) => n.type === 'designSystem')) {
      edges.push(makeEdge(ds.id, newNodeId));
    }
  }

  return edges;
}
