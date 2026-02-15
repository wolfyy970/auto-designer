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
import { useGenerationStore, getActiveResult } from '../../stores/generation-store';
import { useSpecStore } from '../../stores/spec-store';
import { loadCode } from '../../services/idb-storage';
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
  const vsId = node?.data.variantStrategyId as string | undefined;
  if (!vsId) return;

  const result = getActiveResult(useGenerationStore.getState(), vsId);
  if (!result) return;

  // Load code from IndexedDB
  const code = await loadCode(result.id);
  if (!code) return;

  useSpecStore.getState().setCapturingImage('existing-design');
  try {
    const htmlContent = prepareIframeContent(code);
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
    if (import.meta.env.DEV) {
      console.warn('Failed to capture variant screenshot:', err);
    }
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

  // Delete key removes selected nodes (except protected types)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return;
        e.preventDefault();
        const PROTECTED = new Set<string>([
          'compiler',
          ...SECTION_NODE_TYPES,
        ]);
        const removable = selected.filter(
          (n) => !PROTECTED.has(n.type as string),
        );
        const removeNode = useCanvasStore.getState().removeNode;
        removable.forEach((n) => removeNode(n.id));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes]);

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
    if (t && SECTION_NODE_TYPES.has(t)) return 'var(--color-fg-muted)'; // inputs
    switch (t) {
      case 'compiler':
      case 'designSystem':
        return 'var(--color-accent)'; // processing
      case 'hypothesis':
      case 'variant':
      case 'critique':
        return 'var(--color-info)'; // output
      default:
        return 'var(--color-border)';
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
          color="var(--color-border)"
          bgColor="var(--color-surface)"
        />
        {showMiniMap && (
          <MiniMap
            nodeColor={miniMapNodeColor}
            maskColor="rgba(0,0,0,0.08)"
            className="!bottom-4 !right-4 !border-border !shadow-sm"
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
