import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Node,
  type Edge,
  type Viewport,
  type NodeChange,
  type EdgeChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type { DimensionMap } from '../types/compiler';
import type { GenerationResult } from '../types/provider';
import type { SpecSectionId } from '../types/spec';
import { useCompilerStore, allVariantStrategyIds } from './compiler-store';
import { useGenerationStore } from './generation-store';
import { useSpecStore } from './spec-store';
import { generateId, now } from '../lib/utils';

// ── Node type system ────────────────────────────────────────────────

export type CanvasNodeType =
  | 'designBrief'
  | 'existingDesign'
  | 'researchContext'
  | 'objectivesMetrics'
  | 'designConstraints'
  | 'compiler'
  | 'hypothesis'
  | 'generator'
  | 'variant'
  | 'critique';

export type CanvasNodeData = Record<string, unknown> & {
  refId?: string;
};

export type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;
export type CanvasEdge = Edge<{ status: 'idle' | 'processing' | 'complete' | 'error' }>;

/** Map canvas node types to their spec section IDs */
export const NODE_TYPE_TO_SECTION: Partial<Record<CanvasNodeType, SpecSectionId>> = {
  designBrief: 'design-brief',
  existingDesign: 'existing-design',
  researchContext: 'research-context',
  objectivesMetrics: 'objectives-metrics',
  designConstraints: 'design-constraints',
};

export const SECTION_NODE_TYPES = new Set<CanvasNodeType>([
  'designBrief',
  'existingDesign',
  'researchContext',
  'objectivesMetrics',
  'designConstraints',
]);

// ── Layout constants ────────────────────────────────────────────────

// Node widths (must match the w-[Npx] in each node component)
const NODE_W = { section: 320, compiler: 280, hypothesis: 300, generator: 280, variant: 480, critique: 320 };

export const GRID_SIZE = 20;
const NODE_SPACING = 40; // vertical gap between adjacent nodes
const FALLBACK_H: Record<string, number> = {
  section: 200, compiler: 220, hypothesis: 140, generator: 300, variant: 400, critique: 260,
};
const DEFAULT_COL_GAP = 160;
const MIN_COL_GAP = 80;
const MAX_COL_GAP = 320;

/** Get a node's measured height, or a reasonable estimate */
function nodeH(node: CanvasNode): number {
  return (node.measured?.height as number | undefined) ?? (
    SECTION_NODE_TYPES.has(node.type as CanvasNodeType)
      ? FALLBACK_H.section
      : FALLBACK_H[node.type as string] ?? 200
  );
}

/** Compute column X positions from a given gap */
function columnX(gap: number) {
  const s = 0;
  const c = s + NODE_W.section + gap;
  const h = c + NODE_W.compiler + gap;
  const g = h + NODE_W.hypothesis + gap;
  const v = g + NODE_W.generator + gap;
  return { sections: s, compiler: c, hypothesis: h, generator: g, variant: v };
}

/** Snap a position to the nearest grid point */
function snap(pos: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
  };
}

// ── Connection validation ───────────────────────────────────────────

/** Valid source→target type pairs for manual edge creation */
const VALID_CONNECTIONS: Record<string, Set<string>> = {
  designBrief: new Set(['compiler']),
  existingDesign: new Set(['compiler']),
  researchContext: new Set(['compiler']),
  objectivesMetrics: new Set(['compiler']),
  designConstraints: new Set(['compiler']),
  compiler: new Set(['hypothesis']),
  hypothesis: new Set(['generator']),
  generator: new Set(['variant']),
  variant: new Set(['compiler', 'existingDesign', 'critique']),
  critique: new Set(['compiler']),
};

// ── Position helpers ────────────────────────────────────────────────

function computeDefaultPosition(
  type: CanvasNodeType,
  existingNodes: CanvasNode[],
  col: ReturnType<typeof columnX>
): { x: number; y: number } {
  if (SECTION_NODE_TYPES.has(type)) {
    const sectionNodes = existingNodes.filter((n) =>
      SECTION_NODE_TYPES.has(n.type as CanvasNodeType)
    );
    let y = 200;
    for (const sn of sectionNodes) {
      y += nodeH(sn) + NODE_SPACING;
    }
    return snap({ x: col.sections, y });
  }
  if (type === 'compiler') {
    const compilers = existingNodes.filter((n) => n.type === 'compiler');
    if (compilers.length === 0) return snap({ x: col.compiler, y: 300 });
    const lastY = Math.max(...compilers.map((n) => n.position.y + nodeH(n)));
    return snap({ x: col.compiler, y: lastY + NODE_SPACING });
  }
  if (type === 'generator') {
    const generators = existingNodes.filter((n) => n.type === 'generator');
    if (generators.length === 0) return snap({ x: col.generator, y: 300 });
    const lastY = Math.max(...generators.map((n) => n.position.y + nodeH(n)));
    return snap({ x: col.generator, y: lastY + NODE_SPACING });
  }
  if (type === 'hypothesis') {
    const hypNodes = existingNodes.filter((n) => n.type === 'hypothesis');
    let y = 200;
    for (const hn of hypNodes) {
      y += nodeH(hn) + NODE_SPACING;
    }
    return snap({ x: col.hypothesis, y });
  }
  if (type === 'critique') {
    // Place critique nodes to the right of variants
    const critiqueNodes = existingNodes.filter((n) => n.type === 'critique');
    const variantNodes = existingNodes.filter((n) => n.type === 'variant');
    const baseY = variantNodes.length > 0
      ? Math.max(...variantNodes.map((n) => n.position.y + nodeH(n))) + NODE_SPACING
      : 300;
    let y = critiqueNodes.length > 0
      ? Math.max(...critiqueNodes.map((n) => n.position.y + nodeH(n))) + NODE_SPACING
      : baseY;
    return snap({ x: col.variant + NODE_W.variant + 80, y });
  }
  return snap({ x: col.variant, y: 300 });
}

function computeHypothesisPositions(
  count: number,
  centerY: number,
  col: ReturnType<typeof columnX>,
  estimatedHeight = FALLBACK_H.hypothesis
) {
  const totalHeight = count * estimatedHeight + (count - 1) * NODE_SPACING;
  const startY = centerY - totalHeight / 2;
  return Array.from({ length: count }, (_, i) =>
    snap({
      x: col.hypothesis,
      y: startY + i * (estimatedHeight + NODE_SPACING),
    })
  );
}

// ── Store interface ─────────────────────────────────────────────────

interface CanvasStore {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;

  showMiniMap: boolean;
  showGrid: boolean;
  colGap: number;
  autoLayout: boolean;
  generationCounter: number;

  // Non-persisted UI state
  expandedVariantId: string | null;
  lineageNodeIds: Set<string>;
  lineageEdgeIds: Set<string>;

  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void;
  setViewport: (viewport: Viewport) => void;

  toggleMiniMap: () => void;
  toggleGrid: () => void;
  setColGap: (gap: number) => void;
  toggleAutoLayout: () => void;

  addNode: (type: CanvasNodeType, position?: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<CanvasNodeData>) => void;
  disconnectOutputs: (nodeId: string) => void;
  onConnect: (connection: Connection) => void;
  isValidConnection: (connection: Edge | Connection) => boolean;

  setExpandedVariant: (id: string | null) => void;
  computeLineage: (selectedNodeId: string | null) => void;

  initializeCanvas: () => void;
  syncAfterCompile: (dimensionMap: DimensionMap, compilerNodeId: string) => void;
  syncAfterGenerate: (results: GenerationResult[], generatorNodeId: string) => void;
  setEdgeStatusBySource: (sourceId: string, status: 'idle' | 'processing' | 'complete' | 'error') => void;

  applyAutoLayout: () => void;
  reset: () => void;
}

// ── Store implementation ────────────────────────────────────────────

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 0.85 },

      showMiniMap: true,
      showGrid: true,
      colGap: DEFAULT_COL_GAP,
      autoLayout: true,
      generationCounter: 0,

      // Non-persisted UI state
      expandedVariantId: null,
      lineageNodeIds: new Set<string>(),
      lineageEdgeIds: new Set<string>(),

      onNodesChange: (changes) =>
        set({ nodes: applyNodeChanges(changes, get().nodes) }),

      onEdgesChange: (changes) =>
        set({ edges: applyEdgeChanges(changes, get().edges) }),

      setViewport: (viewport) => set({ viewport }),

      toggleMiniMap: () => set((s) => ({ showMiniMap: !s.showMiniMap })),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      setColGap: (gap) => {
        const clamped = Math.max(MIN_COL_GAP, Math.min(MAX_COL_GAP, gap));
        set({ colGap: clamped });
        get().applyAutoLayout();
      },
      toggleAutoLayout: () => {
        const next = !get().autoLayout;
        set({ autoLayout: next });
        if (next) get().applyAutoLayout();
      },

      // ── Connection validation ───────────────────────────────────

      isValidConnection: (connection) => {
        const { nodes } = get();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);
        if (!sourceNode || !targetNode) return false;
        const allowed = VALID_CONNECTIONS[sourceNode.type as string];
        return allowed?.has(targetNode.type as string) ?? false;
      },

      onConnect: (connection) => {
        if (!get().isValidConnection(connection)) return;
        const edgeId = `edge-${connection.source}-to-${connection.target}`;
        if (get().edges.some((e) => e.id === edgeId)) return;
        set({
          edges: [
            ...get().edges,
            {
              id: edgeId,
              source: connection.source!,
              target: connection.target!,
              type: 'dataFlow',
              data: { status: 'idle' as const },
            },
          ],
        });
      },

      // ── Add node with auto-connect ──────────────────────────────

      addNode: (type, position) => {
        const state = get();

        // Sections are still singletons (one per type)
        if (SECTION_NODE_TYPES.has(type) && state.nodes.some((n) => n.type === type)) return;

        // All nodes get unique IDs
        const id = `${type}-${generateId()}`;

        const newNode: CanvasNode = {
          id,
          type,
          position: snap(position ?? computeDefaultPosition(type, state.nodes, columnX(state.colGap))),
          data: {},
        };

        // For manually added hypotheses, create a variant in the compiler store
        if (type === 'hypothesis') {
          const compilerStore = useCompilerStore.getState();
          const compilerNodes = state.nodes.filter((n) => n.type === 'compiler');
          const targetCompilerId = compilerNodes[0]?.id ?? 'manual';

          if (!compilerStore.dimensionMaps[targetCompilerId]) {
            const spec = useSpecStore.getState().spec;
            compilerStore.setDimensionMapForNode(targetCompilerId, {
              id: generateId(),
              specId: spec.id,
              dimensions: [],
              variants: [],
              generatedAt: now(),
              compilerModel: 'manual',
            });
          }
          compilerStore.addVariantToNode(targetCompilerId);
          const map = compilerStore.dimensionMaps[targetCompilerId];
          const lastVariant = map?.variants[map.variants.length - 1];
          if (lastVariant) {
            newNode.data = { refId: lastVariant.id };
          }
        }

        const newEdges = [...state.edges];

        // Auto-connect: section → compiler (only if exactly one compiler)
        if (SECTION_NODE_TYPES.has(type)) {
          const compilers = state.nodes.filter((n) => n.type === 'compiler');
          if (compilers.length === 1) {
            newEdges.push({
              id: `edge-${id}-to-${compilers[0].id}`,
              source: id,
              target: compilers[0].id,
              type: 'dataFlow',
              data: { status: 'idle' },
            });
          }
        }

        // Auto-connect: all sections → new compiler (only if first compiler)
        if (type === 'compiler') {
          const existingCompilers = state.nodes.filter((n) => n.type === 'compiler');
          if (existingCompilers.length === 0) {
            const sectionNodes = state.nodes.filter((n) =>
              SECTION_NODE_TYPES.has(n.type as CanvasNodeType)
            );
            for (const sn of sectionNodes) {
              newEdges.push({
                id: `edge-${sn.id}-to-${id}`,
                source: sn.id,
                target: id,
                type: 'dataFlow',
                data: { status: 'idle' },
              });
            }
          }
        }

        // Auto-connect: hypothesis → generator (only if exactly one generator)
        if (type === 'hypothesis') {
          const generators = state.nodes.filter((n) => n.type === 'generator');
          if (generators.length === 1) {
            newEdges.push({
              id: `edge-${id}-to-${generators[0].id}`,
              source: id,
              target: generators[0].id,
              type: 'dataFlow',
              data: { status: 'idle' },
            });
          }
        }

        // Auto-connect: all hypotheses → new generator (only if first generator)
        if (type === 'generator') {
          const existingGenerators = state.nodes.filter((n) => n.type === 'generator');
          if (existingGenerators.length === 0) {
            const hypothesisNodes = state.nodes.filter((n) => n.type === 'hypothesis');
            for (const hn of hypothesisNodes) {
              newEdges.push({
                id: `edge-${hn.id}-to-${id}`,
                source: hn.id,
                target: id,
                type: 'dataFlow',
                data: { status: 'idle' },
              });
            }
          }
        }

        set({ nodes: [...state.nodes, newNode], edges: newEdges });
        if (get().autoLayout) get().applyAutoLayout();
      },

      // ── Remove node ────────────────────────────────────────────

      removeNode: (nodeId) => {
        const state = get();
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        // If removing a compiler, also clean up its dimension map
        if (node.type === 'compiler') {
          useCompilerStore.getState().removeDimensionMapForNode(nodeId);
        }

        set({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
        });
        if (get().autoLayout) get().applyAutoLayout();
      },

      // ── Remove a single edge ────────────────────────────────────

      removeEdge: (edgeId) => {
        set({ edges: get().edges.filter((e) => e.id !== edgeId) });
      },

      // ── Update node data (for critique text, etc.) ───────────────

      updateNodeData: (nodeId, data) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
          ),
        }),

      // ── Disconnect outgoing edges from a node ────────────────────

      disconnectOutputs: (nodeId) => {
        set({
          edges: get().edges.filter((e) => e.source !== nodeId),
        });
      },

      // ── Full-screen variant preview ────────────────────────────

      setExpandedVariant: (id) => set({ expandedVariantId: id }),

      // ── Lineage highlighting ───────────────────────────────────

      computeLineage: (selectedNodeId) => {
        if (!selectedNodeId) {
          set({ lineageNodeIds: new Set(), lineageEdgeIds: new Set() });
          return;
        }

        const { edges } = get();
        const nodeIds = new Set<string>([selectedNodeId]);
        const edgeIds = new Set<string>();

        // Walk backwards (ancestors)
        const backQueue = [selectedNodeId];
        while (backQueue.length > 0) {
          const current = backQueue.pop()!;
          for (const e of edges) {
            if (e.target === current && !nodeIds.has(e.source)) {
              nodeIds.add(e.source);
              edgeIds.add(e.id);
              backQueue.push(e.source);
            }
            // Also mark edges targeting current node
            if (e.target === current && nodeIds.has(e.source)) {
              edgeIds.add(e.id);
            }
          }
        }

        // Walk forwards (descendants)
        const fwdQueue = [selectedNodeId];
        while (fwdQueue.length > 0) {
          const current = fwdQueue.pop()!;
          for (const e of edges) {
            if (e.source === current && !nodeIds.has(e.target)) {
              nodeIds.add(e.target);
              edgeIds.add(e.id);
              fwdQueue.push(e.target);
            }
            // Also mark edges from current node
            if (e.source === current && nodeIds.has(e.target)) {
              edgeIds.add(e.id);
            }
          }
        }

        // Only set lineage if we found more than just the selected node
        if (nodeIds.size <= 1) {
          set({ lineageNodeIds: new Set(), lineageEdgeIds: new Set() });
        } else {
          set({ lineageNodeIds: nodeIds, lineageEdgeIds: edgeIds });
        }
      },

      // ── Initialize canvas with template ─────────────────────────

      initializeCanvas: () => {
        const state = get();
        if (state.nodes.length > 0) {
          // Clean up orphaned nodes whose backing data no longer exists
          const { dimensionMaps } = useCompilerStore.getState();
          const results = useGenerationStore.getState().results;

          const variantStrategyIdSet = allVariantStrategyIds(dimensionMaps);
          const resultIds = new Set(results.map((r) => r.id));

          const orphanIds = new Set<string>();
          for (const node of state.nodes) {
            if (
              node.type === 'hypothesis' &&
              node.data.refId &&
              !variantStrategyIdSet.has(node.data.refId as string)
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
            set({
              nodes: state.nodes.filter((n) => !orphanIds.has(n.id)),
              edges: state.edges.filter(
                (e) => !orphanIds.has(e.source) && !orphanIds.has(e.target)
              ),
            });
          }

          // Also clean stale "generating" results left over from a previous session
          const staleResults = results.filter((r) => r.status === 'generating');
          if (staleResults.length > 0) {
            for (const r of staleResults) {
              useGenerationStore.getState().updateResult(r.id, {
                status: 'error',
                error: 'Generation interrupted by page reload',
              });
            }
          }

          if (get().autoLayout) get().applyAutoLayout();
          return;
        }

        // Template: Design Brief + Compiler + Generator
        const col = columnX(state.colGap);
        const briefId = `designBrief-${generateId()}`;
        const compilerId = `compiler-${generateId()}`;
        const generatorId = `generator-${generateId()}`;

        set({
          nodes: [
            {
              id: briefId,
              type: 'designBrief',
              position: snap({ x: col.sections, y: 300 }),
              data: {},
            },
            {
              id: compilerId,
              type: 'compiler',
              position: snap({ x: col.compiler, y: 300 }),
              data: {},
            },
            {
              id: generatorId,
              type: 'generator',
              position: snap({ x: col.generator, y: 300 }),
              data: {},
            },
          ],
          edges: [
            {
              id: `edge-${briefId}-to-${compilerId}`,
              source: briefId,
              target: compilerId,
              type: 'dataFlow',
              data: { status: 'idle' },
            },
          ],
        });
      },

      // ── Sync after compilation (scoped to a specific compiler) ──

      syncAfterCompile: (dimensionMap, compilerNodeId) => {
        const state = get();
        const col = columnX(state.colGap);
        const compilerNode = state.nodes.find((n) => n.id === compilerNodeId);
        const compilerY = compilerNode?.position.y ?? 300;
        const generation = state.generationCounter + 1;
        set({ generationCounter: generation });

        // Find OLD hypothesis nodes produced by this compiler (via outgoing edges)
        const oldHypNodeIds = new Set<string>();
        for (const e of state.edges) {
          if (e.source === compilerNodeId) {
            const target = state.nodes.find((n) => n.id === e.target && n.type === 'hypothesis');
            if (target) oldHypNodeIds.add(target.id);
          }
        }

        // Find generators that old hypotheses were connected to (to reconnect new ones)
        const downstreamGeneratorIds = new Set<string>();
        for (const hypId of oldHypNodeIds) {
          for (const e of state.edges) {
            if (e.source === hypId) {
              const target = state.nodes.find((n) => n.id === e.target && n.type === 'generator');
              if (target) downstreamGeneratorIds.add(target.id);
            }
          }
        }

        // Find OLD variant nodes produced by those generators from these hypotheses
        const oldVariantNodeIds = new Set<string>();
        for (const genId of downstreamGeneratorIds) {
          for (const e of state.edges) {
            if (e.source === genId) {
              const target = state.nodes.find((n) => n.id === e.target && n.type === 'variant');
              if (target) oldVariantNodeIds.add(target.id);
            }
          }
        }

        // Remove old hypothesis + variant nodes and all their edges
        const removedIds = new Set([...oldHypNodeIds, ...oldVariantNodeIds]);
        const newNodes = state.nodes.filter((n) => !removedIds.has(n.id));
        const newEdges = state.edges.filter(
          (e) =>
            !removedIds.has(e.source) &&
            !removedIds.has(e.target) &&
            // Also remove outgoing edges from this compiler (will be replaced)
            !(e.source === compilerNodeId && oldHypNodeIds.has(e.target))
        );

        // Create new hypothesis nodes
        const positions = computeHypothesisPositions(
          dimensionMap.variants.length,
          compilerY,
          col
        );

        dimensionMap.variants.forEach((variant, i) => {
          const nodeId = `hypothesis-${variant.id}`;
          newNodes.push({
            id: nodeId,
            type: 'hypothesis',
            position: positions[i],
            data: { refId: variant.id, generation },
          });

          // compiler → hypothesis edge
          newEdges.push({
            id: `edge-${compilerNodeId}-to-${variant.id}`,
            source: compilerNodeId,
            target: nodeId,
            type: 'dataFlow',
            data: { status: 'complete' },
          });

          // hypothesis → downstream generators (reconnect to same generators)
          for (const genId of downstreamGeneratorIds) {
            newEdges.push({
              id: `edge-${nodeId}-to-${genId}`,
              source: nodeId,
              target: genId,
              type: 'dataFlow',
              data: { status: 'idle' },
            });
          }
        });

        set({ nodes: newNodes, edges: newEdges });

        if (get().autoLayout) get().applyAutoLayout();
      },

      // ── Sync after generation (scoped to a specific generator) ──

      syncAfterGenerate: (results, generatorNodeId) => {
        const state = get();
        const col = columnX(state.colGap);

        // Find OLD variant nodes produced by this generator
        const oldVariantNodeIds = new Set<string>();
        for (const e of state.edges) {
          if (e.source === generatorNodeId) {
            const target = state.nodes.find((n) => n.id === e.target && n.type === 'variant');
            if (target) oldVariantNodeIds.add(target.id);
          }
        }

        // Remove old variant nodes and their edges
        const newNodes = state.nodes.filter((n) => !oldVariantNodeIds.has(n.id));
        const newEdges = state.edges.filter(
          (e) => !oldVariantNodeIds.has(e.source) && !oldVariantNodeIds.has(e.target)
        );

        const hypothesisNodes = state.nodes.filter(
          (n) => n.type === 'hypothesis'
        );

        results.forEach((result) => {
          const hypothesisNode = hypothesisNodes.find(
            (n) => n.data.refId === result.variantStrategyId
          );

          const nodeId = `variant-${result.id}`;
          newNodes.push({
            id: nodeId,
            type: 'variant',
            position: snap({
              x: col.variant,
              y: hypothesisNode?.position.y ?? 300,
            }),
            data: {
              refId: result.id,
              generation: hypothesisNode?.data.generation,
            },
          });

          newEdges.push({
            id: `edge-${generatorNodeId}-to-${result.id}`,
            source: generatorNodeId,
            target: nodeId,
            type: 'dataFlow',
            data: {
              status: result.status === 'complete' ? 'complete' : 'processing',
            },
          });
        });

        set({ nodes: newNodes, edges: newEdges });

        if (get().autoLayout) get().applyAutoLayout();
      },

      // ── Edge status ─────────────────────────────────────────────

      setEdgeStatusBySource: (sourceId, status) =>
        set({
          edges: get().edges.map((e) =>
            e.source === sourceId ? { ...e, data: { status } } : e
          ),
        }),

      // ── Auto-layout (edge-driven Sugiyama-style) ─────────────────

      applyAutoLayout: () => {
        const { nodes, edges, colGap: gap } = get();
        if (nodes.length === 0) return;

        // ── 1. Build directed adjacency from edges ──────────────
        const children = new Map<string, string[]>(); // source → targets
        const parents = new Map<string, string[]>();   // target → sources
        const nodeById = new Map<string, CanvasNode>();
        for (const n of nodes) {
          nodeById.set(n.id, n);
          children.set(n.id, []);
          parents.set(n.id, []);
        }
        for (const e of edges) {
          if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
          children.get(e.source)!.push(e.target);
          parents.get(e.target)!.push(e.source);
        }

        // ── 2. Assign ranks via longest-path DFS (cycle-safe) ───
        const rank = new Map<string, number>();
        const onStack = new Set<string>();
        const visited = new Set<string>();

        function dfs(id: string): number {
          if (rank.has(id)) return rank.get(id)!;
          if (onStack.has(id)) return 0; // cycle — treat as rank 0
          onStack.add(id);
          visited.add(id);
          let maxParent = -1;
          for (const pid of parents.get(id) ?? []) {
            maxParent = Math.max(maxParent, dfs(pid));
          }
          const r = maxParent + 1;
          rank.set(id, r);
          onStack.delete(id);
          return r;
        }

        for (const n of nodes) dfs(n.id);

        // ── 3. Group nodes into layers by rank ──────────────────
        const maxRank = Math.max(0, ...rank.values());
        const layers: CanvasNode[][] = Array.from({ length: maxRank + 1 }, () => []);
        for (const n of nodes) {
          layers[rank.get(n.id) ?? 0].push(n);
        }

        // Remove empty layers
        const nonEmptyLayers = layers.filter((l) => l.length > 0);
        if (nonEmptyLayers.length === 0) return;

        // ── 4. Sort nodes within each layer by barycenter ───────
        // Root layer: sort by type order for consistency
        const TYPE_ORDER: Record<string, number> = {
          designBrief: 0, existingDesign: 1, researchContext: 2,
          objectivesMetrics: 3, designConstraints: 4, compiler: 5,
          hypothesis: 6, generator: 7, variant: 8, critique: 9,
        };

        nonEmptyLayers[0].sort((a, b) =>
          (TYPE_ORDER[a.type as string] ?? 99) - (TYPE_ORDER[b.type as string] ?? 99)
        );

        // For subsequent layers, sort by average Y of parents (barycenter)
        for (let li = 1; li < nonEmptyLayers.length; li++) {
          // Build a map of node positions from previous layer placements
          // (using order index as proxy since we haven't placed yet)
          const prevLayer = nonEmptyLayers[li - 1];
          const prevOrder = new Map<string, number>();
          prevLayer.forEach((n, i) => prevOrder.set(n.id, i));

          nonEmptyLayers[li].sort((a, b) => {
            const aParents = (parents.get(a.id) ?? []).filter((p) => prevOrder.has(p));
            const bParents = (parents.get(b.id) ?? []).filter((p) => prevOrder.has(p));
            const aCenter = aParents.length > 0
              ? aParents.reduce((s, p) => s + prevOrder.get(p)!, 0) / aParents.length
              : Infinity;
            const bCenter = bParents.length > 0
              ? bParents.reduce((s, p) => s + prevOrder.get(p)!, 0) / bParents.length
              : Infinity;
            return aCenter - bCenter;
          });
        }

        // ── 5. Compute column X positions (skip empty ranks) ────
        function nodeWidth(n: CanvasNode): number {
          if (SECTION_NODE_TYPES.has(n.type as CanvasNodeType)) return NODE_W.section;
          return NODE_W[n.type as keyof typeof NODE_W] ?? 300;
        }

        const layerX: number[] = [];
        let curX = 0;
        for (const layer of nonEmptyLayers) {
          layerX.push(curX);
          const widest = Math.max(...layer.map(nodeWidth));
          curX += widest + gap;
        }

        // ── 6. Measure each layer's total height ────────────────
        const layerHeights = nonEmptyLayers.map((layer) =>
          layer.reduce((sum, n) => sum + nodeH(n), 0) +
          Math.max(0, layer.length - 1) * NODE_SPACING
        );
        const tallestHeight = Math.max(...layerHeights);

        // ── 7. Stack each layer centered on the tallest layer ───
        const centerY = 200 + tallestHeight / 2;
        const positions = new Map<string, { x: number; y: number }>();

        for (let li = 0; li < nonEmptyLayers.length; li++) {
          const layer = nonEmptyLayers[li];
          const totalH = layerHeights[li];
          let y = centerY - totalH / 2;

          for (const n of layer) {
            positions.set(n.id, snap({ x: layerX[li], y }));
            y += nodeH(n) + NODE_SPACING;
          }
        }

        // ── 8. Nudge single-node layers toward parent/child avg ─
        for (let li = 0; li < nonEmptyLayers.length; li++) {
          const layer = nonEmptyLayers[li];
          if (layer.length !== 1) continue;
          const n = layer[0];
          const pIds = parents.get(n.id) ?? [];
          const cIds = children.get(n.id) ?? [];
          const anchors: number[] = [];
          for (const pid of pIds) {
            const p = positions.get(pid);
            const pn = nodeById.get(pid);
            if (p && pn) anchors.push(p.y + nodeH(pn) / 2);
          }
          for (const cid of cIds) {
            const c = positions.get(cid);
            const cn = nodeById.get(cid);
            if (c && cn) anchors.push(c.y + nodeH(cn) / 2);
          }
          if (anchors.length > 0) {
            const avgAnchor = anchors.reduce((s, v) => s + v, 0) / anchors.length;
            const targetY = avgAnchor - nodeH(n) / 2;
            positions.set(n.id, snap({ x: positions.get(n.id)!.x, y: targetY }));
          }
        }

        // ── 9. Normalize Y so topmost node starts at y ≈ 100 ────
        let minY = Infinity;
        for (const pos of positions.values()) {
          if (pos.y < minY) minY = pos.y;
        }
        const yShift = 100 - minY;
        if (Math.abs(yShift) > 1) {
          for (const [id, pos] of positions) {
            positions.set(id, snap({ x: pos.x, y: pos.y + yShift }));
          }
        }

        // ── 10. Apply positions ─────────────────────────────────
        const updated = nodes.map((n) => {
          const pos = positions.get(n.id);
          return pos ? { ...n, position: pos } : n;
        });

        set({ nodes: updated });
      },

      // ── Reset ───────────────────────────────────────────────────

      reset: () =>
        set({
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 0.85 },
          generationCounter: 0,
          expandedVariantId: null,
          lineageNodeIds: new Set(),
          lineageEdgeIds: new Set(),
        }),
    }),
    {
      name: 'auto-designer-canvas',
      version: 5,
      migrate: (_persistedState: unknown, version: number) => {
        // v0/v1 → v4: complete reset (too old to migrate incrementally)
        if (version < 2) {
          return {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 0.85 },
            showMiniMap: true,
            showGrid: true,
            colGap: DEFAULT_COL_GAP,
            autoLayout: true,
          };
        }
        // v2 → v3: fix stale 'incubator' nodes
        if (version < 3) {
          const state = _persistedState as Record<string, unknown>;
          const nodes = (state.nodes as Array<Record<string, unknown>>) ?? [];
          const edges = (state.edges as Array<Record<string, unknown>>) ?? [];
          // Falls through to v3→v4 migration below
          _persistedState = {
            ...state,
            nodes: nodes.map((n) => ({
              ...n,
              type: n.type === 'incubator' ? 'generator' : n.type,
              id: n.id === 'incubator-node' ? 'generator-node' : n.id,
            })),
            edges: edges.map((e) => ({
              ...e,
              source: e.source === 'incubator-node' ? 'generator-node' : e.source,
              target: e.target === 'incubator-node' ? 'generator-node' : e.target,
              id: typeof e.id === 'string'
                ? e.id.replace('incubator', 'generator')
                : e.id,
            })),
          };
        }
        // v3 → v4: reset canvas for multi-compiler/generator support
        // Old canvases used fixed IDs (compiler-node, generator-node)
        if (version < 4) {
          return {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 0.85 },
            showMiniMap: true,
            showGrid: true,
            colGap: DEFAULT_COL_GAP,
            autoLayout: true,
            generationCounter: 0,
          };
        }
        // v4 → v5: add generationCounter (default 0)
        if (version < 5) {
          const state = _persistedState as Record<string, unknown>;
          return { ...state, generationCounter: 0 };
        }
        return _persistedState as Record<string, unknown>;
      },
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
        showMiniMap: state.showMiniMap,
        showGrid: state.showGrid,
        colGap: state.colGap,
        autoLayout: state.autoLayout,
        generationCounter: state.generationCounter,
      }),
    }
  )
);
