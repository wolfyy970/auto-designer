import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Code, Eye, Loader2, AlertCircle, RotateCcw, X, Minus, Plus, MousePointer, Maximize2 } from 'lucide-react';
import { useGenerationStore } from '../../../stores/generation-store';
import { useCompilerStore, findVariantStrategy } from '../../../stores/compiler-store';
import { prepareIframeContent, renderErrorHtml } from '../../../lib/iframe-utils';
import { useCanvasStore, type CanvasNodeData } from '../../../stores/canvas-store';
import { useLineageDim } from '../../../hooks/useLineageDim';
import { badgeColor } from '../../../lib/generation-badge-colors';

type VariantNodeType = Node<CanvasNodeData, 'variant'>;

/** The virtual viewport width the iframe renders at before scaling */
const REFERENCE_WIDTH = 1280;
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.05;

function VariantNode({ id, data, selected }: NodeProps<VariantNodeType>) {
  const resultId = data.refId as string;
  const generation = data.generation as number | undefined;
  const lineageDim = useLineageDim(id, !!selected);
  const result = useGenerationStore(
    (s) => s.results.find((r) => r.id === resultId)
  );
  const strategy = useCompilerStore((s) => {
    if (!result) return undefined;
    return findVariantStrategy(s.dimensionMaps, result.variantStrategyId);
  });

  const removeNode = useCanvasStore((s) => s.removeNode);
  const setExpandedVariant = useCanvasStore((s) => s.setExpandedVariant);
  const [showSource, setShowSource] = useState(false);
  const [interacting, setInteracting] = useState(false);

  // Exit interact mode when node is deselected or Escape is pressed
  useEffect(() => {
    if (!selected) setInteracting(false);
  }, [selected]);

  useEffect(() => {
    if (!interacting) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInteracting(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [interacting]);

  // Auto-zoom: measure container width and fit to REFERENCE_WIDTH
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomOffset, setZoomOffset] = useState(0); // manual adjustment on top of auto

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const autoZoom = containerWidth > 0 ? containerWidth / REFERENCE_WIDTH : 0.4;
  const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, autoZoom + zoomOffset));

  const zoomIn = useCallback(() => setZoomOffset((o) => o + ZOOM_STEP), []);
  const zoomOut = useCallback(() => setZoomOffset((o) => o - ZOOM_STEP), []);
  const resetZoom = useCallback(() => setZoomOffset(0), []);

  const htmlContent = useMemo(() => {
    if (!result?.code) return '';
    try {
      return prepareIframeContent(result.code);
    } catch (err) {
      return renderErrorHtml(
        err instanceof Error ? err.message : String(err)
      );
    }
  }, [result?.code]);

  const borderClass = selected
    ? 'border-blue-400 ring-2 ring-blue-200'
    : result?.status === 'error'
      ? 'border-red-300'
      : result?.status === 'complete'
        ? 'border-gray-200'
        : 'border-dashed border-gray-300';

  return (
    <>
      <div className={`relative flex h-full min-h-[420px] w-[480px] flex-col rounded-lg border bg-white shadow-sm ${borderClass} ${lineageDim}`}>
        {/* Generation badge */}
        {generation != null && (
          <span className={`absolute -right-2 -top-2 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${badgeColor(generation).bg} ${badgeColor(generation).text}`}>
            G{generation}
          </span>
        )}

        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
        />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-semibold text-gray-900">
              {strategy?.name ?? 'Variant'}
            </h4>
            {result?.metadata?.model && (
              <p className="text-[10px] text-gray-400">
                {result.metadata.model}
                {result.metadata.durationMs != null && (
                  <> &middot; {(result.metadata.durationMs / 1000).toFixed(1)}s</>
                )}
                {result.metadata.tokensUsed != null && (
                  <> &middot; {result.metadata.tokensUsed} tokens</>
                )}
                {result.metadata.truncated && (
                  <span className="ml-1 text-amber-500">(truncated)</span>
                )}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Zoom control */}
            {result?.status === 'complete' && result.code && !showSource && (
              <div className="nodrag flex items-center rounded border border-gray-200">
                <button
                  onClick={zoomOut}
                  disabled={zoom <= ZOOM_MIN + 0.01}
                  className="px-1 py-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  title="Zoom out"
                >
                  <Minus size={10} />
                </button>
                <button
                  onClick={resetZoom}
                  className="min-w-[32px] text-center text-[10px] tabular-nums text-gray-500 hover:text-gray-900"
                  title="Reset to auto-fit"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={zoomIn}
                  disabled={zoom >= ZOOM_MAX - 0.01}
                  className="px-1 py-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  title="Zoom in"
                >
                  <Plus size={10} />
                </button>
              </div>
            )}

            {/* Expand to full-screen */}
            {result?.status === 'complete' && result.code && (
              <button
                onClick={() => setExpandedVariant(resultId)}
                className="nodrag rounded border border-gray-200 p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Full-screen preview"
              >
                <Maximize2 size={10} />
              </button>
            )}

            {/* Preview/Source toggle */}
            {result?.status === 'complete' && result.code && (
              <div className="nodrag flex rounded border border-gray-200">
                <button
                  onClick={() => setShowSource(false)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] ${
                    !showSource
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Eye size={10} />
                  Preview
                </button>
                <button
                  onClick={() => setShowSource(true)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] ${
                    showSource
                      ? 'bg-gray-100 font-medium text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Code size={10} />
                  Source
                </button>
              </div>
            )}

            {/* Remove button */}
            <button
              onClick={() => removeNode(id)}
              className="nodrag shrink-0 rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div ref={contentRef} className="relative flex-1 overflow-hidden rounded-b-lg">
          {/* Generating state */}
          {result?.status === 'generating' && (
            <div className="flex h-full items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2
                  size={24}
                  className="mx-auto mb-2 animate-spin text-gray-400"
                />
                <p className="text-xs text-gray-500">Generating...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {result?.status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center bg-red-50 p-4">
              <AlertCircle size={20} className="mb-2 text-red-400" />
              <p className="mb-2 text-center text-xs text-red-600">
                {result.error ?? 'Generation failed'}
              </p>
              <button className="nodrag flex items-center gap-1 rounded bg-red-100 px-2.5 py-1 text-[10px] text-red-700 hover:bg-red-200">
                <RotateCcw size={10} />
                Retry
              </button>
            </div>
          )}

          {/* Pending state */}
          {(!result || result.status === 'pending') && (
            <div className="flex h-full items-center justify-center bg-gray-50">
              <p className="text-xs text-gray-400">Waiting...</p>
            </div>
          )}

          {/* Complete: preview or source */}
          {result?.status === 'complete' && result.code && (
            <>
              {showSource ? (
                <pre className="nodrag nowheel h-full overflow-auto whitespace-pre-wrap bg-gray-50 px-3 py-2 text-[10px] text-gray-700">
                  {result.code}
                </pre>
              ) : (
                <>
                  <iframe
                    srcDoc={htmlContent}
                    sandbox="allow-scripts"
                    title={`Variant: ${strategy?.name ?? 'preview'}`}
                    className="absolute left-0 top-0 border-0 bg-white"
                    style={{
                      width: `${100 / zoom}%`,
                      height: `${100 / zoom}%`,
                      transform: `scale(${zoom})`,
                      transformOrigin: '0 0',
                      pointerEvents: interacting ? 'auto' : 'none',
                    }}
                  />
                  {/* Overlay: blocks iframe events so node is draggable */}
                  {!interacting && (
                    <div
                      className="absolute inset-0 z-10"
                      onDoubleClick={() => setInteracting(true)}
                    />
                  )}
                  {/* Interact mode indicator + exit */}
                  {interacting && (
                    <button
                      className="nodrag absolute right-2 top-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-1 text-[10px] font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
                      onClick={() => setInteracting(false)}
                      title="Exit interact mode (Esc)"
                    >
                      <MousePointer size={10} />
                      Interactive — click to exit
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Source handle (right) → can connect to next compiler for iteration */}
        <Handle
          type="source"
          position={Position.Right}
          className="!h-4 !w-4 !border-2 !border-gray-300 !bg-white"
        />
      </div>
    </>
  );
}

export default memo(VariantNode);
