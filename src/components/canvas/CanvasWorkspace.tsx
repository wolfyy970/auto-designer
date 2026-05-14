import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStoreApi,
  type Viewport,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';

import { useCanvasStore, INPUT_NODE_TYPES, GRID_SIZE, type CanvasNodeType } from '../../stores/canvas-store';
import { useGenerationStore } from '../../stores/generation-store';
import { GENERATION_STATUS } from '../../constants/generation';
import { INPUT_GHOST_NODE_TYPE, PREVIEW_NODE_GENERATING_Z_INDEX } from '../../constants/canvas';
import { getPreviewNodeData } from '../../lib/canvas-node-data';
import {
  scheduleCanvasFitView,
  scheduleCanvasFitViewToNodes,
  scheduleCanvasStarterView,
  scheduleCanvasFocusToNode,
  DEFAULT_FIT_VIEW_OPTIONS,
  fitViewOptionsWithInspectorDock,
  NODE_FOCUS_MIN_ZOOM,
} from '../../lib/canvas-fit-view';
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
} from '../../lib/canvas-zoom';
import type { WorkspaceNode } from '../../types/workspace-graph';
import { toReactFlowEdges, toReactFlowNodes } from '../../workspace/reactflow-adapter';
import { nodeTypes } from './nodes/node-types';
import { edgeTypes } from './edges/edge-types';
import CanvasHeader from './CanvasHeader';
import OpenRouterBudgetBanner from './OpenRouterBudgetBanner';
import CanvasToolbar from './CanvasToolbar';
import VariantPreviewOverlay from './VariantPreviewOverlay';
import VariantRunInspector from './VariantRunInspector';
import OptionalInputsTip from './OptionalInputsTip';
import { useCanvasOrchestrator } from './hooks/useCanvasOrchestrator';
import { useNodeDeletion } from './hooks/useNodeDeletion';
import { useFeedbackLoopConnection } from './hooks/useFeedbackLoopConnection';
import { useCanvasZoomInput } from './hooks/useCanvasZoomInput';
import { PermanentDeleteConfirmProvider } from '../../contexts/PermanentDeleteConfirmProvider';
import { useAppConfig } from '../../hooks/useAppConfig';
import { useSyncEvaluatorDefaultsFromConfig } from '../../hooks/useSyncEvaluatorDefaultsFromConfig';
import { useTheme } from '@ds/lib/use-theme';

function CanvasInner() {
  useCanvasOrchestrator();
  const theme = useTheme();
  const {
    setCenter,
    getNodes,
    getEdges,
    getViewport,
    fitView,
    zoomIn,
    zoomOut,
    setViewport: setFlowViewport,
  } = useReactFlow();
  const rfStore = useStoreApi();
  const {
    canvasZoomRootRef,
    markPointerOverCanvas,
    markPointerOutsideCanvas,
  } = useCanvasZoomInput({
    getViewport,
    setFlowViewport,
    fitView,
    zoomIn,
    zoomOut,
  });
  useNodeDeletion({ getNodes, getEdges });
  useSyncEvaluatorDefaultsFromConfig();

  const { data: appConfig } = useAppConfig();
  const lockdown = appConfig?.lockdown === true;

  const [canvasHydrated, setCanvasHydrated] = useState(() =>
    useCanvasStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = useCanvasStore.persist.onFinishHydration(() => {
      setCanvasHydrated(true);
    });
    return unsub;
  }, []);

  // Phase 7 D removed the canvas Model node, so there is no canvas-state
  // reconciliation to do under lockdown — the per-task Settings store
  // and the route-boundary clamp own the pin. The hydration flag is kept
  // for any future canvas-side lockdown work.
  void canvasHydrated;
  void lockdown;
  const { handleConnect } = useFeedbackLoopConnection();

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const genResults = useGenerationStore((s) => s.results);

  const rfNodes = useMemo(() => {
    const generatingByStrategy = new Set(
      genResults
        .filter((r) => r.status === GENERATION_STATUS.GENERATING)
        .map((r) => r.strategyId),
    );
    const generatingIds = new Set(
      genResults
        .filter((r) => r.status === GENERATION_STATUS.GENERATING)
        .map((r) => r.id),
    );
    return toReactFlowNodes(nodes).map((n) => {
      if (n.type !== 'preview') return n;
      const data = getPreviewNodeData(n as unknown as WorkspaceNode);
      const vsId = data?.strategyId;
      const refId = data?.refId;
      const bumpZ =
        (vsId != null && generatingByStrategy.has(vsId)) ||
        (!!refId && generatingIds.has(refId));
      if (bumpZ) {
        return { ...n, zIndex: PREVIEW_NODE_GENERATING_Z_INDEX };
      }
      return n;
    });
  }, [nodes, genResults]);
  const rfEdges = useMemo(() => toReactFlowEdges(edges), [edges]);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const isValidConnection = useCanvasStore((s) => s.isValidConnection);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const initializeCanvas = useCanvasStore((s) => s.initializeCanvas);
  const showMiniMap = useCanvasStore((s) => s.showMiniMap);
  const computeLineage = useCanvasStore((s) => s.computeLineage);
  const setConnectingFrom = useCanvasStore((s) => s.setConnectingFrom);
  const pendingFitViewAfterTemplate = useCanvasStore((s) => s.pendingFitViewAfterTemplate);
  const consumePendingFitView = useCanvasStore((s) => s.consumePendingFitView);
  const pendingFocusNodeId = useCanvasStore((s) => s.pendingFocusNodeId);
  const consumePendingNodeFocus = useCanvasStore((s) => s.consumePendingNodeFocus);
  const pendingFitNodeIds = useCanvasStore((s) => s.pendingFitNodeIds);
  const consumePendingFitNodes = useCanvasStore((s) => s.consumePendingFitNodes);
  const runInspectorPreviewNodeId = useCanvasStore((s) => s.runInspectorPreviewNodeId);
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  useEffect(() => {
    if (!pendingFitViewAfterTemplate) return;
    const id = scheduleCanvasStarterView(
      {
        fitView,
        setCenter,
        getViewportSize: () => {
          const state = rfStore.getState();
          return {
            width: state.width || window.innerWidth,
            height: state.height || window.innerHeight,
          };
        },
      },
      getNodes(),
      consumePendingFitView,
    );
    return () => {
      if (id != null) window.clearTimeout(id);
    };
  }, [pendingFitViewAfterTemplate, fitView, setCenter, getNodes, consumePendingFitView, rfStore]);

  // Fit to a specific node set (e.g. incubator + freshly-created hypotheses)
  // once React Flow reports those nodes are measured. Waiting on
  // `useNodesInitialized()` avoids the race where a delay-based fit fires
  // before new nodes have been laid out + measured.
  useEffect(() => {
    if (!pendingFitNodeIds || pendingFitNodeIds.length === 0) return;
    if (!nodesInitialized) return;
    const id = scheduleCanvasFitViewToNodes(
      fitView,
      pendingFitNodeIds,
      consumePendingFitNodes,
    );
    return () => {
      if (id != null) window.clearTimeout(id);
    };
  }, [pendingFitNodeIds, nodesInitialized, fitView, consumePendingFitNodes]);

  useEffect(() => {
    if (!pendingFocusNodeId) return;
    const id = scheduleCanvasFocusToNode(
      setCenter,
      pendingFocusNodeId,
      (nodeId) => getNodes().find((node) => node.id === nodeId),
      () => getViewport().zoom,
      consumePendingNodeFocus,
    );
    return () => {
      if (id != null) window.clearTimeout(id);
    };
  }, [pendingFocusNodeId, setCenter, getNodes, getViewport, consumePendingNodeFocus]);

  const runInspectorFitPrevRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = runInspectorFitPrevRef.current;
    const curr = runInspectorPreviewNodeId;
    let tid: ReturnType<typeof setTimeout> | undefined;
    if (prev === null && curr !== null) {
      tid = scheduleCanvasFitView(fitView, undefined, () =>
        fitViewOptionsWithInspectorDock(rfStore.getState().width || window.innerWidth),
      );
    } else if (prev !== null && curr === null) {
      tid = scheduleCanvasFitView(fitView, undefined, { ...DEFAULT_FIT_VIEW_OPTIONS });
    }
    runInspectorFitPrevRef.current = curr;
    return () => {
      if (tid != null) window.clearTimeout(tid);
    };
  }, [runInspectorPreviewNodeId, fitView, rfStore]);

  const handleViewportChange = useCallback(
    (vp: Viewport) => setViewport(vp),
    [setViewport]
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      computeLineage(selected.length === 1 ? selected[0].id : null);
    },
    [computeLineage]
  );

  // Layer 3A: handle glow during connection drag
  const handleConnectStart = useCallback(
    (_: MouseEvent | TouchEvent, params: { nodeId: string | null; handleType: string | null }) => {
      if (!params.nodeId || !params.handleType) return;
      const node = useCanvasStore.getState().nodes.find((n) => n.id === params.nodeId);
      if (node?.type) {
        setConnectingFrom({
          nodeType: node.type as CanvasNodeType,
          handleType: params.handleType as 'source' | 'target',
        });
      }
    },
    [setConnectingFrom]
  );

  const handleConnectEnd = useCallback(() => {
    setConnectingFrom(null);
  }, [setConnectingFrom]);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      // Don't zoom when clicking interactive elements inside the node
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, button, [role="combobox"]')) {
        return;
      }
      scheduleCanvasFocusToNode(
        setCenter,
        node.id,
        (nodeId) => getNodes().find((n) => n.id === nodeId),
        () => getViewport().zoom,
        undefined,
        { zoom: NODE_FOCUS_MIN_ZOOM },
      );
    },
    [setCenter, getNodes, getViewport],
  );

  const miniMapNodeColor = useCallback((node: { type?: string }) => {
    const t = node.type as CanvasNodeType | undefined;
    if (t && INPUT_NODE_TYPES.has(t)) return 'var(--color-fg-muted)'; // inputs
    if (t === INPUT_GHOST_NODE_TYPE) return 'var(--color-fg-faint)';
    switch (t) {
      case 'incubator':
      case 'designSystem':
        return 'var(--color-accent)'; // processing
      case 'hypothesis':
      case 'preview':
        return 'var(--color-info)'; // output
      default:
        return 'var(--color-border)';
    }
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col">
      <CanvasHeader />
      <OpenRouterBudgetBanner />
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1">
          <div
            ref={canvasZoomRootRef}
            className="h-full w-full touch-none"
            onPointerEnter={markPointerOverCanvas}
            onPointerLeave={markPointerOutsideCanvas}
          >
            <ReactFlow
              className="h-full w-full"
              colorMode={theme}
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onConnectStart={handleConnectStart}
              onConnectEnd={handleConnectEnd}
              isValidConnection={isValidConnection}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultViewport={viewport}
              onViewportChange={handleViewportChange}
              onNodeClick={handleNodeClick}
              onSelectionChange={handleSelectionChange}
              nodesDraggable={false}
              snapToGrid={true}
              snapGrid={[GRID_SIZE, GRID_SIZE]}
              fitViewOptions={{ padding: 0.15 }}
              connectionRadius={40}
              minZoom={CANVAS_MIN_ZOOM}
              maxZoom={CANVAS_MAX_ZOOM}
              zoomOnScroll={false}
              zoomOnPinch={false}
              proOptions={{ hideAttribution: true }}
              deleteKeyCode={null}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={GRID_SIZE}
                size={1.5}
                offset={0.75}
                color="var(--color-border)"
                bgColor="var(--color-surface)"
              />
              {showMiniMap && (
                <MiniMap
                  nodeColor={miniMapNodeColor}
                  maskColor="var(--color-overlay)"
                  className="!bottom-4 !right-4 !border-border !shadow-sm"
                  style={{ width: 133, height: 100 }}
                />
              )}
              <CanvasToolbar />
              <OptionalInputsTip />
            </ReactFlow>
          </div>
          <VariantPreviewOverlay />
          <VariantRunInspector
            onPointerEnter={markPointerOutsideCanvas}
          />
        </div>
      </div>
    </div>
  );
}

export default function CanvasWorkspace() {
  return (
    <ReactFlowProvider>
      <PermanentDeleteConfirmProvider>
        <CanvasInner />
      </PermanentDeleteConfirmProvider>
    </ReactFlowProvider>
  );
}
