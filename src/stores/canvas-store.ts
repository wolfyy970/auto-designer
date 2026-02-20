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
import type { VariantStrategy } from '../types/compiler';
import type { GenerationResult } from '../types/provider';
import type { SpecSectionId } from '../types/spec';
import { useCompilerStore } from './compiler-store';
import { useGenerationStore } from './generation-store';
import { useSpecStore } from './spec-store';
import { generateId, now } from '../lib/utils';
import {
  computeAutoLayout,
  computeDefaultPosition,
  computeHypothesisPositions,
  columnX,
  snap,
  DEFAULT_COL_GAP,
  MIN_COL_GAP,
  MAX_COL_GAP,
  SECTION_NODE_TYPES,
} from '../lib/canvas-layout';
import { isValidConnection as checkValidConnection, buildAutoConnectEdges } from '../lib/canvas-connections';
import { computeLineage } from '../lib/canvas-graph';
import { STORAGE_KEYS } from '../lib/storage-keys';
import { migrateCanvasState } from './canvas-migrations';

// Debounced auto-layout on dimension changes (avoids infinite loop)
let dimensionLayoutTimer: ReturnType<typeof setTimeout> | null = null;

// Re-export for consumers
export { GRID_SIZE, SECTION_NODE_TYPES } from '../lib/canvas-layout';

// ── Node type system ────────────────────────────────────────────────

export type CanvasNodeType =
  | 'designBrief'
  | 'existingDesign'
  | 'researchContext'
  | 'objectivesMetrics'
  | 'designConstraints'
  | 'designSystem'
  | 'compiler'
  | 'hypothesis'
  | 'variant'
  | 'critique'
  | 'model';

export type CanvasNodeData = Record<string, unknown> & {
  refId?: string;
  variantStrategyId?: string;
};

export type EdgeStatus = 'idle' | 'processing' | 'complete' | 'error';

type CanvasNode = Node<CanvasNodeData, CanvasNodeType>;
type CanvasEdge = Edge<{ status: EdgeStatus }>;

/** Map canvas node types to their spec section IDs */
export const NODE_TYPE_TO_SECTION: Partial<Record<CanvasNodeType, SpecSectionId>> = {
  designBrief: 'design-brief',
  existingDesign: 'existing-design',
  researchContext: 'research-context',
  objectivesMetrics: 'objectives-metrics',
  designConstraints: 'design-constraints',
};


// ── Store interface ─────────────────────────────────────────────────

interface CanvasStore {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;

  showMiniMap: boolean;
  showGrid: boolean;
  colGap: number;
  autoLayout: boolean;
  // Non-persisted UI state
  expandedVariantId: string | null;
  lineageNodeIds: Set<string>;
  lineageEdgeIds: Set<string>;
  /** Transient map: variantStrategyId → canvas nodeId (for edge status callbacks during generation) */
  variantNodeIdMap: Map<string, string>;
  /** Transient: which node type + handle type is currently being dragged from (for handle glow) */
  connectingFrom: { nodeType: CanvasNodeType; handleType: 'source' | 'target' } | null;

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
  syncAfterCompile: (newVariants: VariantStrategy[], compilerNodeId: string) => void;
  syncAfterGenerate: (results: GenerationResult[], hypothesisNodeId: string) => void;
  forkHypothesisVariants: (hypothesisNodeId: string) => void;
  clearVariantNodeIdMap: () => void;
  setConnectingFrom: (from: CanvasStore['connectingFrom']) => void;
  setEdgeStatusBySource: (sourceId: string, status: EdgeStatus) => void;
  setEdgeStatusByTarget: (targetId: string, status: EdgeStatus) => void;

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
      // Non-persisted UI state
      expandedVariantId: null,
      lineageNodeIds: new Set<string>(),
      lineageEdgeIds: new Set<string>(),
      variantNodeIdMap: new Map<string, string>(),
      connectingFrom: null,

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
        // Debounced re-layout on dimension changes (e.g. image added makes node taller)
        if (
          get().autoLayout &&
          changes.some((c: NodeChange) => c.type === 'dimensions')
        ) {
          if (dimensionLayoutTimer) clearTimeout(dimensionLayoutTimer);
          dimensionLayoutTimer = setTimeout(() => {
            dimensionLayoutTimer = null;
            if (get().autoLayout) get().applyAutoLayout();
          }, 200);
        }
      },

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
        return checkValidConnection(sourceNode.type as string, targetNode.type as string);
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

        const autoEdges = buildAutoConnectEdges(id, type, state.nodes);

        set({ nodes: [...state.nodes, newNode], edges: [...state.edges, ...autoEdges] });
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

        // If removing a hypothesis, cascade-delete its connected variants
        // and remove the strategy from the compiler store
        const removeIds = new Set<string>([nodeId]);
        if (node.type === 'hypothesis') {
          const refId = node.data.refId as string | undefined;
          if (refId) useCompilerStore.getState().removeVariant(refId);
          for (const e of state.edges) {
            if (e.source !== nodeId) continue;
            const target = state.nodes.find((n) => n.id === e.target && n.type === 'variant');
            if (target) removeIds.add(target.id);
          }
        }

        set({
          nodes: state.nodes.filter((n) => !removeIds.has(n.id)),
          edges: state.edges.filter(
            (e) => !removeIds.has(e.source) && !removeIds.has(e.target)
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
          // Bail out if lineage is already empty — avoids creating new Set
          // references that trigger unnecessary re-renders in every node.
          if (get().lineageNodeIds.size === 0) return;
          set({ lineageNodeIds: new Set(), lineageEdgeIds: new Set() });
          return;
        }

        const { nodeIds, edgeIds } = computeLineage(get().edges, selectedNodeId);

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
          // Orphan cleanup is handled by useCanvasOrchestrator
          if (get().autoLayout) get().applyAutoLayout();
          return;
        }

        // Template: Design Brief + Compiler
        const col = columnX(state.colGap);
        const briefId = `designBrief-${generateId()}`;
        const compilerId = `compiler-${generateId()}`;

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

      syncAfterCompile: (newVariants, compilerNodeId) => {
        if (newVariants.length === 0) return;
        const state = get();
        const col = columnX(state.colGap);
        const compilerNode = state.nodes.find((n) => n.id === compilerNodeId);
        const compilerY = compilerNode?.position.y ?? 300;

        // Find bottom-most existing hypothesis Y connected to this compiler
        let maxY = compilerY;
        for (const e of state.edges) {
          if (e.source !== compilerNodeId) continue;
          const target = state.nodes.find((n) => n.id === e.target && n.type === 'hypothesis');
          if (target) {
            const bottom = target.position.y + (target.measured?.height ?? 300);
            if (bottom > maxY) maxY = bottom;
          }
        }

        // Position new hypotheses below existing ones
        const startY = maxY + 40; // gap below last existing hypothesis
        const positions = computeHypothesisPositions(
          newVariants.length,
          startY,
          col
        );

        const addedNodes = [...state.nodes];
        const addedEdges = [...state.edges];

        newVariants.forEach((variant, i) => {
          const nodeId = `hypothesis-${variant.id}`;
          addedNodes.push({
            id: nodeId,
            type: 'hypothesis',
            position: positions[i],
            data: { refId: variant.id },
          });

          // compiler → hypothesis edge
          addedEdges.push({
            id: `edge-${compilerNodeId}-to-${variant.id}`,
            source: compilerNodeId,
            target: nodeId,
            type: 'dataFlow',
            data: { status: 'complete' },
          });

          // Auto-connect designSystem nodes to new hypothesis
          const dsEdges = buildAutoConnectEdges(nodeId, 'hypothesis', addedNodes);
          addedEdges.push(...dsEdges);
        });

        set({ nodes: addedNodes, edges: addedEdges });

        if (get().autoLayout) get().applyAutoLayout();
      },

      // ── Sync after generation (scoped to a specific hypothesis) ──
      // Version-stacking: reuse existing variant node, update refId to latest result.

      syncAfterGenerate: (results, hypothesisNodeId) => {
        const state = get();
        const col = columnX(state.colGap);
        const hypothesisNode = state.nodes.find((n) => n.id === hypothesisNodeId);

        // Find existing variant node connected to this hypothesis (for stacking)
        const existingVariantByStrategy = new Map<string, string>(); // vsId → nodeId
        for (const e of state.edges) {
          if (e.source === hypothesisNodeId) {
            const target = state.nodes.find(
              (n) => n.id === e.target && n.type === 'variant',
            );
            if (target?.data.variantStrategyId) {
              existingVariantByStrategy.set(
                target.data.variantStrategyId as string,
                target.id,
              );
            }
          }
        }

        const newNodes = [...state.nodes];
        const newEdges = [...state.edges];
        const nodeIdMap = new Map<string, string>();

        results.forEach((result) => {
          const existingNodeId = existingVariantByStrategy.get(
            result.variantStrategyId,
          );

          if (existingNodeId) {
            // UPDATE existing variant node — point refId to the new result
            const idx = newNodes.findIndex((n) => n.id === existingNodeId);
            if (idx !== -1) {
              newNodes[idx] = {
                ...newNodes[idx],
                data: {
                  ...newNodes[idx].data,
                  refId: result.id,
                  variantStrategyId: result.variantStrategyId,
                },
              };
            }
            // Update edge status to processing
            const edgeIdx = newEdges.findIndex(
              (e) => e.source === hypothesisNodeId && e.target === existingNodeId,
            );
            if (edgeIdx !== -1) {
              newEdges[edgeIdx] = {
                ...newEdges[edgeIdx],
                data: { status: 'processing' },
              };
            }
            nodeIdMap.set(result.variantStrategyId, existingNodeId);
          } else {
            // CREATE new variant node with unique ID
            const nodeId = `variant-${generateId()}`;
            newNodes.push({
              id: nodeId,
              type: 'variant',
              position: snap({
                x: col.variant,
                y: hypothesisNode?.position.y ?? 300,
              }),
              data: {
                refId: result.id,
                variantStrategyId: result.variantStrategyId,
              },
            });

            newEdges.push({
              id: `edge-${hypothesisNodeId}-to-${nodeId}`,
              source: hypothesisNodeId,
              target: nodeId,
              type: 'dataFlow',
              data: { status: 'processing' },
            });
            nodeIdMap.set(result.variantStrategyId, nodeId);
          }
        });

        set({ nodes: newNodes, edges: newEdges, variantNodeIdMap: nodeIdMap });

        if (get().autoLayout) get().applyAutoLayout();
      },

      // ── Fork: pin existing variants and disconnect from hypothesis ──

      forkHypothesisVariants: (hypothesisNodeId) => {
        const state = get();
        const genState = useGenerationStore.getState();

        // Find variant nodes connected to this hypothesis
        const variantNodeIds: string[] = [];
        for (const e of state.edges) {
          if (e.source === hypothesisNodeId) {
            const target = state.nodes.find(
              (n) => n.id === e.target && n.type === 'variant',
            );
            if (target) variantNodeIds.push(target.id);
          }
        }

        if (variantNodeIds.length === 0) return;

        const variantIdSet = new Set(variantNodeIds);

        // Pin each variant with its current active result's runId
        const newNodes = state.nodes.map((n) => {
          if (!variantIdSet.has(n.id)) return n;
          const vsId = n.data.variantStrategyId as string | undefined;
          if (!vsId) return n;

          // Find the active result's runId for this variant
          const stack = genState.results
            .filter((r) => r.variantStrategyId === vsId)
            .sort((a, b) => b.runNumber - a.runNumber);
          const selectedId = genState.selectedVersions[vsId];
          const active = selectedId
            ? stack.find((r) => r.id === selectedId)
            : stack.find((r) => r.status === 'complete') ?? stack[0];

          return {
            ...n,
            position: { x: n.position.x, y: n.position.y + 200 },
            data: {
              ...n.data,
              pinnedRunId: active?.runId ?? 'unknown',
            },
          };
        });

        // Remove hypothesis → variant edges
        const newEdges = state.edges.filter(
          (e) => !(e.source === hypothesisNodeId && variantIdSet.has(e.target)),
        );

        set({ nodes: newNodes, edges: newEdges });
      },

      clearVariantNodeIdMap: () => set({ variantNodeIdMap: new Map() }),
      setConnectingFrom: (from) => set({ connectingFrom: from }),

      // ── Edge status ─────────────────────────────────────────────

      setEdgeStatusBySource: (sourceId, status) =>
        set({
          edges: get().edges.map((e) =>
            e.source === sourceId ? { ...e, data: { status } } : e
          ),
        }),

      setEdgeStatusByTarget: (targetId, status) =>
        set({
          edges: get().edges.map((e) =>
            e.target === targetId ? { ...e, data: { status } } : e
          ),
        }),

      // ── Auto-layout (delegates to pure function) ─────────────────

      applyAutoLayout: () => {
        const { nodes, edges, colGap } = get();
        if (nodes.length === 0) return;
        set({ nodes: computeAutoLayout(nodes, edges, colGap) });
      },

      // ── Reset ───────────────────────────────────────────────────

      reset: () =>
        set({
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 0.85 },
          expandedVariantId: null,
          lineageNodeIds: new Set(),
          lineageEdgeIds: new Set(),
        }),
    }),
    {
      name: STORAGE_KEYS.CANVAS,
      version: 13,
      migrate: (persistedState: unknown, version: number) => {
        // Try to parse the raw state safely to avoid runtime crashes
        // before passing it to the complex migration logic
        try {
          if (typeof persistedState === 'string') {
            return migrateCanvasState(JSON.parse(persistedState), version);
          }
          return migrateCanvasState(persistedState, version);
        } catch (e) {
          console.error("Failed to parse persisted canvas state for migration", e);
          return migrateCanvasState({}, version);
        }
      },
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
        showMiniMap: state.showMiniMap,
        showGrid: state.showGrid,
        colGap: state.colGap,
        autoLayout: state.autoLayout,
      }),
    }
  )
);
