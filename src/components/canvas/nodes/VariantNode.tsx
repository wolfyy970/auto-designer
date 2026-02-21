import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useElapsedTimer } from '../../../hooks/useElapsedTimer';
import NodeShell from './NodeShell';
import VariantToolbar from './VariantToolbar';
import VariantFooter from './VariantFooter';

type VariantNodeType = Node<VariantNodeData, 'variant'>;

/** Scrolling terminal-like activity log during generation */
function ActivityLog({ entries }: { entries?: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries?.length]);

  if (!entries || entries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-between p-4">
        <div className="flex flex-col gap-2.5">
          <div className="h-4 w-4/5 animate-pulse rounded bg-border/50" />
          <div className="h-3 w-full animate-pulse rounded bg-border/40" style={{ animationDelay: '75ms' }} />
          <div className="h-3 w-[90%] animate-pulse rounded bg-border/40" style={{ animationDelay: '150ms' }} />
          <div className="h-3 w-3/4 animate-pulse rounded bg-border/40" style={{ animationDelay: '225ms' }} />
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-[85%] animate-pulse rounded bg-border/30" style={{ animationDelay: '300ms' }} />
          <div className="h-3 w-full animate-pulse rounded bg-border/30" style={{ animationDelay: '375ms' }} />
          <div className="h-3 w-2/3 animate-pulse rounded bg-border/30" style={{ animationDelay: '450ms' }} />
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="h-3 w-[70%] animate-pulse rounded bg-border/20" style={{ animationDelay: '525ms' }} />
          <div className="h-3 w-[90%] animate-pulse rounded bg-border/20" style={{ animationDelay: '600ms' }} />
          <div className="h-3 w-4/5 animate-pulse rounded bg-border/20" style={{ animationDelay: '675ms' }} />
          <div className="h-3 w-3/5 animate-pulse rounded bg-border/20" style={{ animationDelay: '750ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="nodrag nowheel min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-[1.6]"
    >
      {entries.map((entry, i) => {
        const isSuccess = entry.startsWith('\u2713');
        const isError = entry.startsWith('\u2717');
        const isPlan = entry.startsWith('Plan:') || entry.startsWith('  \u25cb');
        const isThinking = !isSuccess && !isError && !isPlan;

        return (
          <div
            key={i}
            className={`py-0.5 ${
              isSuccess ? 'text-success' :
              isError ? 'text-error' :
              isPlan ? 'text-accent' :
              'text-fg-muted'
            }`}
          >
            {isThinking ? (
              <span className="italic">{entry}</span>
            ) : (
              entry
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const { code, isLoading: codeLoading } = useResultCode(result?.id, result?.status);

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

  const isGenerating = result?.status === 'generating';
  const elapsed = useElapsedTimer(isGenerating);

  const htmlContent = useMemo(() => {
    if (!code) return '';
    try {
      return prepareIframeContent(code);
    } catch (err) {
      return renderErrorHtml(normalizeError(err));
    }
  }, [code]);

  const hasCode = result?.status === 'complete' && !!code;

  const status = isArchived
    ? 'dimmed' as const
    : result?.status === 'error'
      ? 'error' as const
      : result?.status === 'generating'
        ? 'processing' as const
        : hasCode
          ? 'filled' as const
          : 'empty' as const;

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
      status={status}
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
        {/* Generating state — activity log with live progress */}
        {result?.status === 'generating' && (
          <div className="absolute inset-0 flex flex-col bg-surface">
            <ActivityLog entries={result.activityLog} />

            <div className="flex flex-col gap-2 border-t border-border-subtle px-4 py-3">
              <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full w-full animate-pulse rounded-full bg-accent/60" />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-fg-secondary">
                  <Loader2 size={10} className="animate-spin text-accent" />
                  {result.progressMessage || 'Generating…'}
                </span>
                <span className="tabular-nums text-xs text-fg-muted">
                  {elapsed}s
                </span>
              </div>
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
