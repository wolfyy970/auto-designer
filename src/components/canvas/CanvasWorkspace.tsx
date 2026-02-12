import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  type Viewport,
  type Connection,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore, SECTION_NODE_TYPES, GRID_SIZE, type CanvasNodeType } from '../../stores/canvas-store';
import { useGenerationStore } from '../../stores/generation-store';
import { useSpecStore } from '../../stores/spec-store';
import { captureScreenshot, prepareIframeContent } from '../../lib/iframe-utils';
import { generateId, now } from '../../lib/utils';
import { nodeTypes } from './nodes/node-types';
import { edgeTypes } from './edges/edge-types';
import CanvasHeader from './CanvasHeader';
import CanvasToolbar from './CanvasToolbar';
import CanvasContextMenu from './CanvasContextMenu';
import VariantPreviewOverlay from './VariantPreviewOverlay';
import { useCanvasOrchestrator } from './hooks/useCanvasOrchestrator';

/**
 * When a variant node connects to an existing design node,
 * capture a screenshot and add it as a reference image.
 * The edge persists as a visible feedback-loop connection.
 */
async function captureVariantIntoExistingDesign(
  variantNodeId: string,
  _existingDesignNodeId: string
) {
  const node = useCanvasStore.getState().nodes.find((n) => n.id === variantNodeId);
  if (!node?.data.refId) return;

  const result = useGenerationStore.getState().results.find(
    (r) => r.id === node.data.refId
  );
  if (!result?.code) return;

  const store = useSpecStore.getState();
  store.setCapturingImage('existing-design');
  try {
    const htmlContent = prepareIframeContent(result.code);
    const dataUrl = await captureScreenshot(htmlContent);
    useSpecStore.getState().addImage('existing-design', {
      id: generateId(),
      filename: `variant-${result.metadata?.model ?? 'design'}.png`,
      dataUrl,
      description: result.metadata?.model
        ? `Generated variant (${result.metadata.model})`
        : 'Generated design variant',
      createdAt: now(),
    });
  } catch (err) {
    console.warn('Failed to capture variant screenshot:', err);
  } finally {
    useSpecStore.getState().setCapturingImage(null);
  }
}

function CanvasInner() {
  useCanvasOrchestrator();
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const storeOnConnect = useCanvasStore((s) => s.onConnect);
  const isValidConnection = useCanvasStore((s) => s.isValidConnection);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const initializeCanvas = useCanvasStore((s) => s.initializeCanvas);
  const showMiniMap = useCanvasStore((s) => s.showMiniMap);
  const autoLayout = useCanvasStore((s) => s.autoLayout);
  const computeLineage = useCanvasStore((s) => s.computeLineage);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      // Create the edge via the store
      storeOnConnect(connection);

      // If variant → existingDesign, capture screenshot
      const storeNodes = useCanvasStore.getState().nodes;
      const sourceNode = storeNodes.find((n) => n.id === connection.source);
      const targetNode = storeNodes.find((n) => n.id === connection.target);
      if (
        sourceNode?.type === 'variant' &&
        targetNode?.type === 'existingDesign' &&
        connection.source &&
        connection.target
      ) {
        captureVariantIntoExistingDesign(connection.source, connection.target);
      }

      // Re-layout after new edge
      const cs = useCanvasStore.getState();
      if (cs.autoLayout) cs.applyAutoLayout();
    },
    [storeOnConnect]
  );

  const handleViewportChange = useCallback(
    (vp: Viewport) => setViewport(vp),
    [setViewport]
  );

  const handlePaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      computeLineage(selected.length === 1 ? selected[0].id : null);
    },
    [computeLineage]
  );

  const miniMapNodeColor = useCallback((node: { type?: string }) => {
    const t = node.type as CanvasNodeType | undefined;
    if (t && SECTION_NODE_TYPES.has(t)) return '#3b82f6'; // blue - inputs
    switch (t) {
      case 'compiler':
        return '#8b5cf6'; // purple - compiler
      case 'hypothesis':
        return '#f59e0b'; // amber - hypotheses
      case 'generator':
        return '#ec4899'; // pink - generator
      case 'variant':
        return '#10b981'; // emerald - variants
      case 'critique':
        return '#f59e0b'; // amber - critique
      default:
        return '#d1d5db';
    }
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <CanvasHeader />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={viewport}
        onViewportChange={handleViewportChange}
        onPaneContextMenu={handlePaneContextMenu}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        nodesDraggable={!autoLayout}
        snapToGrid={true}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitViewOptions={{ padding: 0.15 }}
        connectionRadius={40}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={GRID_SIZE}
          size={1.5}
          offset={0.75}
          color="#d1d5db"
          bgColor="#f9fafb"
        />
        {showMiniMap && (
          <MiniMap
            nodeColor={miniMapNodeColor}
            maskColor="rgba(0,0,0,0.08)"
            className="!bottom-4 !right-4 !border-gray-200 !shadow-sm"
          />
        )}
        <CanvasToolbar />
      </ReactFlow>
      {contextMenu && (
        <CanvasContextMenu
          screenX={contextMenu.x}
          screenY={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
      <VariantPreviewOverlay />
    </div>
  );
}

export default function CanvasWorkspace() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
