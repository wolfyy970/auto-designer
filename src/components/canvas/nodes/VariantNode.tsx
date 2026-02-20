import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useGenerationStore } from '../../../stores/generation-store';
import { normalizeError } from '../../../lib/error-utils';
import { useCompilerStore, findVariantStrategy } from '../../../stores/compiler-store';
import { prepareIframeContent, renderErrorHtml } from '../../../lib/iframe-utils';
import { useCanvasStore } from '../../../stores/canvas-store';
import type { VariantNodeData } from '../../../types/canvas-data';
import { useResultCode } from '../../../hooks/useResultCode';
import { useVersionStack } from '../../../hooks/useVersionStack';
import { useVariantZoom } from '../../../hooks/useVariantZoom';
import NodeShell from './NodeShell';
import VariantToolbar from './VariantToolbar';
import VariantFooter from './VariantFooter';

type VariantNodeType = Node<VariantNodeData, 'variant'>;

function VariantNode({ id, data, selected }: NodeProps<VariantNodeType>) {
  const variantStrategyId = data.variantStrategyId;
  const pinnedRunId = data.pinnedRunId;
  const isArchived = !!pinnedRunId;

  const {
    results,
    stack,
    activeResult,
    completedStack,
    stackIndex,
    stackTotal,
    versionKey,
    goNewer,
    goOlder,
    setSelectedVersion,
  } = useVersionStack(variantStrategyId, pinnedRunId);

  // Legacy fallback: if no variantStrategyId, use refId directly
  const legacyResult = useMemo(
    () =>
      !variantStrategyId && data.refId
        ? results.find((r) => r.id === data.refId)
        : undefined,
    [variantStrategyId, data.refId, results],
  );
  const result = activeResult ?? legacyResult;

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

  const { contentRef, zoom, zoomIn, zoomOut, resetZoom } = useVariantZoom();

  // Elapsed timer during generation
  const [elapsed, setElapsed] = useState(0);
  const isGenerating = result?.status === 'generating';
  useEffect(() => {
    if (!isGenerating) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [isGenerating]);

  const htmlContent = useMemo(() => {
    if (!code) return '';
    try {
      return prepareIframeContent(code);
    } catch (err) {
      return renderErrorHtml(normalizeError(err));
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

  const stackClass = stackTotal >= 3
    ? 'variant-stack-deep'
    : stackTotal === 2
      ? 'variant-stack'
      : '';

  return (
    <NodeShell
      nodeId={id}
      nodeType="variant"
      selected={!!selected}
      width="w-node-variant"
      borderClass={borderClass}
      className={`relative flex h-full min-h-[420px] flex-col${isArchived ? ' opacity-75' : ''} ${stackClass}`}
      handleColor={hasCode ? 'green' : 'amber'}
    >
      <VariantToolbar
        variantName={variantName}
        isArchived={isArchived}
        hasCode={hasCode}
        nodeId={id}
        stackTotal={stackTotal}
        stackIndex={stackIndex}
        goNewer={goNewer}
        goOlder={goOlder}
        zoom={zoom}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetZoom={resetZoom}
        onDownload={handleDownload}
        onDeleteVersion={handleDeleteVersion}
        onExpand={() => setExpandedVariant(id)}
        onRemove={() => removeNode(id)}
      />

      {/* ── Content area ──────────────────────────────────────── */}
      <div ref={contentRef} className="relative flex-1 overflow-hidden">
        {/* Generating state — skeleton with elapsed timer */}
        {result?.status === 'generating' && (
          <div className="flex h-full flex-col gap-2.5 bg-surface p-4">
            {/* Top shimmer group */}
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
              className="h-3 w-2/3 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '225ms' }}
            />
            <div
              className="h-3 w-4/5 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '300ms' }}
            />
            <div
              className="h-3 w-full animate-pulse rounded bg-border/60"
              style={{ animationDelay: '375ms' }}
            />

            {/* Timer centered */}
            <div className="mt-auto flex flex-col items-center justify-center py-4">
              <span className="tabular-nums text-7xl font-extralight tracking-tight text-fg">
                {elapsed}
              </span>
              <span className="mt-1 text-xs text-fg-muted">seconds</span>
            </div>

            {/* Bottom shimmer group */}
            <div
              className="mt-auto h-3 w-5/6 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '450ms' }}
            />
            <div
              className="h-3 w-2/3 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '525ms' }}
            />
            <div
              className="h-3 w-full animate-pulse rounded bg-border/60"
              style={{ animationDelay: '600ms' }}
            />
            <div
              className="h-3 w-3/4 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '675ms' }}
            />
            <div
              className="h-3 w-4/5 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '750ms' }}
            />
            <div
              className="h-3 w-2/3 animate-pulse rounded bg-border/60"
              style={{ animationDelay: '825ms' }}
            />
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
        {result?.status === 'complete' && codeLoading && (
          <div className="flex h-full items-center justify-center bg-surface">
            <Loader2 size={14} className="animate-spin text-fg-muted" />
          </div>
        )}

        {/* Complete but code missing from IndexedDB */}
        {result?.status === 'complete' && !codeLoading && !code && (
          <div className="flex h-full flex-col items-center justify-center bg-surface p-4">
            <AlertCircle size={16} className="mb-2 text-fg-muted" />
            <p className="text-center text-xs text-fg-muted">
              Code unavailable — may need to regenerate
            </p>
          </div>
        )}

        {/* Complete: rendered preview */}
        {hasCode && (
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
        )}
      </div>

      {/* ── Metadata footer ─────────────────────────────────── */}
      {result?.status === 'complete' && (
        <VariantFooter result={result} />
      )}
    </NodeShell>
  );
}

export default memo(VariantNode);
