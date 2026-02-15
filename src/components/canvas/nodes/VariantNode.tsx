import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import {
  Download,
  Loader2,
  AlertCircle,
  X,
  Minus,
  Plus,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import {
  useGenerationStore,
  getStack,
  getActiveResult,
  getScopedStack,
  getScopedActiveResult,
} from '../../../stores/generation-store';
import { useCompilerStore, findVariantStrategy } from '../../../stores/compiler-store';
import { prepareIframeContent, renderErrorHtml } from '../../../lib/iframe-utils';
import { useCanvasStore, type CanvasNodeData } from '../../../stores/canvas-store';
import { useResultCode } from '../../../hooks/useResultCode';
import { badgeColor } from '../../../lib/badge-colors';
import NodeShell from './NodeShell';

type VariantNodeType = Node<CanvasNodeData, 'variant'>;

/** The virtual viewport width the iframe renders at before scaling */
const REFERENCE_WIDTH = 1280;
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.05;

function VariantNode({ id, data, selected }: NodeProps<VariantNodeType>) {
  const variantStrategyId = data.variantStrategyId as string | undefined;
  const pinnedRunId = data.pinnedRunId as string | undefined;
  const isArchived = !!pinnedRunId;

  // Subscribe to primitive values to avoid re-renders from new array references.
  // getStack/getActiveResult create new objects; we derive stable primitives here.
  const results = useGenerationStore((s) => s.results);
  const selectedVersions = useGenerationStore((s) => s.selectedVersions);

  // Use scoped helpers when this variant is pinned (archived)
  const stack = useMemo(
    () => {
      if (!variantStrategyId) return [];
      const state = { results, selectedVersions };
      return pinnedRunId
        ? getScopedStack(state, variantStrategyId, pinnedRunId)
        : getStack(state, variantStrategyId);
    },
    [results, selectedVersions, variantStrategyId, pinnedRunId],
  );
  const activeResult = useMemo(
    () => {
      if (!variantStrategyId) return undefined;
      const state = { results, selectedVersions };
      return pinnedRunId
        ? getScopedActiveResult(state, variantStrategyId, pinnedRunId)
        : getActiveResult(state, variantStrategyId);
    },
    [results, selectedVersions, variantStrategyId, pinnedRunId],
  );
  // Legacy fallback: if no variantStrategyId, use refId directly
  const legacyResult = useMemo(
    () =>
      !variantStrategyId && data.refId
        ? results.find((r) => r.id === data.refId)
        : undefined,
    [variantStrategyId, data.refId, results],
  );
  const result = activeResult ?? legacyResult;

  const setSelectedVersion = useGenerationStore(
    (s) => s.setSelectedVersion,
  );
  const deleteResult = useGenerationStore((s) => s.deleteResult);

  // Load code from IndexedDB
  const { code, isLoading: codeLoading } = useResultCode(result?.id);

  const strategy = useCompilerStore((s) => {
    const vsId = variantStrategyId ?? result?.variantStrategyId;
    if (!vsId) return undefined;
    return findVariantStrategy(s.dimensionMaps, vsId);
  });

  const removeNode = useCanvasStore((s) => s.removeNode);
  const setExpandedVariant = useCanvasStore((s) => s.setExpandedVariant);

  const variantName = strategy?.name ?? 'Variant';

  // Stack navigation — use scoped key for pinned variants to avoid collision
  const versionKey = pinnedRunId && variantStrategyId
    ? `${variantStrategyId}:${pinnedRunId}`
    : variantStrategyId;

  const completedStack = useMemo(
    () => stack.filter((r) => r.status === 'complete'),
    [stack],
  );
  const stackIndex = completedStack.findIndex((r) => r.id === result?.id);
  const stackTotal = completedStack.length;

  const goNewer = useCallback(() => {
    if (!versionKey || stackIndex <= 0) return;
    setSelectedVersion(versionKey, completedStack[stackIndex - 1].id);
  }, [versionKey, stackIndex, completedStack, setSelectedVersion]);

  const goOlder = useCallback(() => {
    if (!versionKey || stackIndex >= completedStack.length - 1) return;
    setSelectedVersion(versionKey, completedStack[stackIndex + 1].id);
  }, [versionKey, stackIndex, completedStack, setSelectedVersion]);

  const handleDeleteVersion = useCallback(async () => {
    if (!result || !versionKey) return;
    const resultId = result.id;
    // Select next version before deleting
    if (stackTotal > 1) {
      const nextResult =
        completedStack.find((r) => r.id !== resultId) ?? stack.find((r) => r.id !== resultId);
      if (nextResult) {
        setSelectedVersion(versionKey, nextResult.id);
      }
    }
    deleteResult(resultId);
  }, [
    result,
    versionKey,
    stackTotal,
    completedStack,
    stack,
    setSelectedVersion,
    deleteResult,
  ]);

  const handleDownload = useCallback(() => {
    if (!code) return;
    const slug = variantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, variantName]);

  // Auto-zoom: measure container width and fit to REFERENCE_WIDTH
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoomOffset, setZoomOffset] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const autoZoom =
    containerWidth > 0 ? containerWidth / REFERENCE_WIDTH : 0.4;
  const zoom = Math.max(
    ZOOM_MIN,
    Math.min(ZOOM_MAX, autoZoom + zoomOffset),
  );

  const zoomIn = useCallback(() => setZoomOffset((o) => o + ZOOM_STEP), []);
  const zoomOut = useCallback(
    () => setZoomOffset((o) => o - ZOOM_STEP),
    [],
  );
  const resetZoom = useCallback(() => setZoomOffset(0), []);

  const htmlContent = useMemo(() => {
    if (!code) return '';
    try {
      return prepareIframeContent(code);
    } catch (err) {
      return renderErrorHtml(
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [code]);

  const hasCode = result?.status === 'complete' && !!code;

  const borderClass = selected
    ? 'border-accent ring-2 ring-accent/20'
    : isArchived
      ? 'border-border/50'
      : result?.status === 'error'
        ? 'border-error/50'
        : result?.status === 'generating'
          ? 'border-accent/50 animate-pulse'
          : hasCode
            ? 'border-border'
            : 'border-dashed border-border';

  return (
    <NodeShell
      nodeId={id}
      selected={!!selected}
      width="w-node-variant"
      borderClass={borderClass}
      className={`relative flex h-full min-h-[420px] flex-col${isArchived ? ' opacity-75' : ''}`}
      handleColor={hasCode ? 'green' : 'amber'}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border-subtle px-2.5 py-1">
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
          {variantName}
        </h4>
        {isArchived && (
          <span className="shrink-0 rounded bg-fg-faint/10 px-1.5 py-px text-badge font-medium text-fg-muted">
            Archived
          </span>
        )}

        {/* Stack navigation */}
        {stackTotal > 1 && (
          <div className="nodrag flex items-center gap-0.5 text-fg-faint">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goNewer();
              }}
              disabled={stackIndex <= 0}
              className="rounded p-px transition-colors hover:text-fg-muted disabled:opacity-30"
              title="Newer version"
            >
              <ChevronLeft size={10} />
            </button>
            <span className="px-0.5 text-badge tabular-nums">
              {stackIndex + 1}/{stackTotal}
            </span>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goOlder();
              }}
              disabled={stackIndex >= stackTotal - 1}
              className="rounded p-px transition-colors hover:text-fg-muted disabled:opacity-30"
              title="Older version"
            >
              <ChevronRight size={10} />
            </button>
          </div>
        )}

        {/* Zoom — whisper-quiet utility */}
        {hasCode && (
          <div className="nodrag flex items-center text-fg-faint">
            <button
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN + 0.01}
              className="rounded p-px transition-colors hover:text-fg-muted disabled:opacity-30"
              title="Zoom out"
            >
              <Minus size={8} />
            </button>
            <span
              onClick={resetZoom}
              className="cursor-pointer px-px text-badge font-light tabular-nums transition-colors hover:text-fg-muted"
              title="Reset to auto-fit"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX - 0.01}
              className="rounded p-px transition-colors hover:text-fg-muted disabled:opacity-30"
              title="Zoom in"
            >
              <Plus size={8} />
            </button>
          </div>
        )}

        {/* Actions */}
        {hasCode && (
          <>
            <div className="h-3 w-px bg-border-subtle" />
            <button
              onClick={handleDownload}
              className="nodrag rounded p-0.5 text-fg-faint transition-colors hover:text-fg-muted"
              title={`Download ${variantName}`}
            >
              <Download size={10} />
            </button>
            <button
              onClick={() =>
                setExpandedVariant(id)
              }
              className="nodrag rounded p-0.5 text-fg-faint transition-colors hover:text-fg-muted"
              title="Full-screen preview"
            >
              <Maximize2 size={10} />
            </button>
            {stackTotal > 1 && (
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteVersion();
                }}
                className="nodrag rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
                title="Delete this version"
              >
                <Trash2 size={10} />
              </button>
            )}
          </>
        )}

        <button
          onClick={() => removeNode(id)}
          className="nodrag shrink-0 rounded p-0.5 text-fg-faint transition-colors hover:bg-error-subtle hover:text-error"
          title="Remove"
        >
          <X size={10} />
        </button>
      </div>

      {/* ── Content area ──────────────────────────────────────── */}
      <div ref={contentRef} className="relative flex-1 overflow-hidden">
        {/* Generating state — skeleton shimmer */}
        {result?.status === 'generating' && (
          <div className="flex h-full flex-col gap-3 bg-surface p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-border" />
            <div
              className="h-3 w-full animate-pulse rounded bg-border/60"
              style={{ animationDelay: '75ms' }}
            />
            <div
              className="h-3 w-5/6 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="mt-1 h-24 w-full animate-pulse rounded bg-border/40"
              style={{ animationDelay: '225ms' }}
            />
            <div
              className="h-3 w-2/3 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '300ms' }}
            />
            <div
              className="h-3 w-4/5 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '375ms' }}
            />
            <div
              className="mt-1 h-16 w-full animate-pulse rounded bg-border/40"
              style={{ animationDelay: '450ms' }}
            />
            <div
              className="h-3 w-1/2 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '525ms' }}
            />
            <div className="mt-auto flex items-center justify-center gap-1.5 text-fg-muted">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-xs">Generating...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {result?.status === 'error' && (
          <div className="flex h-full flex-col items-center justify-center bg-error-subtle p-4">
            <AlertCircle size={16} className="mb-2 text-error" />
            <p className="text-center text-xs text-error">
              {result.error ?? 'Generation failed'}
            </p>
          </div>
        )}

        {/* Pending / no result */}
        {(!result || result.status === 'pending') && (
          <div className="flex h-full items-center justify-center bg-surface">
            <p className="text-xs text-fg-muted">Waiting...</p>
          </div>
        )}

        {/* Loading code from IndexedDB */}
        {result?.status === 'complete' && codeLoading && !code && (
          <div className="flex h-full items-center justify-center bg-surface">
            <Loader2 size={14} className="animate-spin text-fg-muted" />
          </div>
        )}

        {/* Complete: rendered preview */}
        {hasCode && (
          <>
            <iframe
              srcDoc={htmlContent}
              sandbox="allow-scripts"
              title={`Variant: ${variantName}`}
              className="absolute left-0 top-0 border-0 bg-white"
              style={{
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`,
                transform: `scale(${zoom})`,
                transformOrigin: '0 0',
                pointerEvents: 'auto',
              }}
            />
          </>
        )}
      </div>

      {/* ── Metadata footer ─────────────────────────────────── */}
      {(hasCode || (result?.status === 'complete' && codeLoading)) && (
        <div className="flex items-center gap-1.5 border-t border-border-subtle px-2.5 py-1 text-badge text-fg-faint">
          {result?.runNumber != null && (
            <span
              className={`rounded px-1 py-px font-bold leading-none ${badgeColor(result.runNumber).bg} ${badgeColor(result.runNumber).text}`}
            >
              v{result.runNumber}
            </span>
          )}
          {result?.metadata?.model && (
            <span className="truncate">{result.metadata.model}</span>
          )}
          {result?.metadata?.durationMs != null && (
            <>
              <span>&middot;</span>
              <span>
                {(result.metadata.durationMs / 1000).toFixed(1)}s
              </span>
            </>
          )}
          {result?.metadata?.tokensUsed != null && (
            <>
              <span>&middot;</span>
              <span>
                {result.metadata.tokensUsed.toLocaleString()} tok
              </span>
            </>
          )}
          {result?.metadata?.truncated && (
            <span className="text-warning">(truncated)</span>
          )}
        </div>
      )}
    </NodeShell>
  );
}

export default memo(VariantNode);
