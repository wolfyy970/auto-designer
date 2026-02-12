import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Columns2 } from 'lucide-react';
import { useGenerationStore } from '../../stores/generation-store';
import { useCompilerStore, findVariantStrategy } from '../../stores/compiler-store';
import { useCanvasStore } from '../../stores/canvas-store';
import { prepareIframeContent, renderErrorHtml } from '../../lib/iframe-utils';

export default function VariantPreviewOverlay() {
  const expandedVariantId = useCanvasStore((s) => s.expandedVariantId);
  const setExpandedVariant = useCanvasStore((s) => s.setExpandedVariant);
  const results = useGenerationStore((s) => s.results);
  const dimensionMaps = useCompilerStore((s) => s.dimensionMaps);

  const [compareId, setCompareId] = useState<string | null>(null);

  const result = results.find((r) => r.id === expandedVariantId);
  const compareResult = compareId ? results.find((r) => r.id === compareId) : null;

  const completeResults = useMemo(
    () => results.filter((r) => r.status === 'complete' && r.code && r.id !== expandedVariantId),
    [results, expandedVariantId]
  );

  const close = useCallback(() => {
    setExpandedVariant(null);
    setCompareId(null);
  }, [setExpandedVariant]);

  // Close on Escape
  useEffect(() => {
    if (!expandedVariantId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedVariantId, close]);

  if (!expandedVariantId || !result?.code) return null;

  const strategy = findVariantStrategy(dimensionMaps, result.variantStrategyId);

  function renderPanel(r: typeof result, label?: string) {
    if (!r?.code) return null;
    const strat = findVariantStrategy(dimensionMaps, r.variantStrategyId);
    let content: string;
    try {
      content = prepareIframeContent(r.code);
    } catch (err) {
      content = renderErrorHtml(err instanceof Error ? err.message : String(err));
    }
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {label && (
          <div className="shrink-0 border-b border-white/10 px-4 py-1.5 text-[11px] text-white/60">
            {label}
          </div>
        )}
        <div className="shrink-0 border-b border-white/10 px-4 py-2">
          <h3 className="text-sm font-medium text-white">
            {strat?.name ?? 'Variant'}
          </h3>
          {r.metadata?.model && (
            <p className="text-xs text-white/50">
              {r.metadata.model}
              {r.metadata.durationMs != null && (
                <> &middot; {(r.metadata.durationMs / 1000).toFixed(1)}s</>
              )}
              {r.metadata.tokensUsed != null && (
                <> &middot; {r.metadata.tokensUsed} tokens</>
              )}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-hidden bg-white">
          <iframe
            srcDoc={content}
            sandbox="allow-scripts"
            title={`Preview: ${strat?.name ?? 'Variant'}`}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {strategy?.name ?? 'Variant Preview'}
          </h2>
          {result.metadata?.model && (
            <p className="text-xs text-white/40">{result.metadata.model}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Compare toggle */}
          {!compareId && completeResults.length > 0 && (
            <button
              onClick={() => setCompareId(completeResults[0].id)}
              className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              <Columns2 size={14} />
              Compare
            </button>
          )}
          {compareId && (
            <button
              onClick={() => setCompareId(null)}
              className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              Exit Compare
            </button>
          )}
          <button
            onClick={close}
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {compareId ? (
          <>
            {renderPanel(result, 'Original')}
            <div className="w-px bg-white/10" />
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Compare selector */}
              <div className="shrink-0 border-b border-white/10 px-4 py-1.5">
                <select
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                  className="rounded border border-white/20 bg-transparent px-2 py-0.5 text-[11px] text-white/70 outline-none"
                >
                  {completeResults.map((r) => {
                    const s = findVariantStrategy(dimensionMaps, r.variantStrategyId);
                    return (
                      <option key={r.id} value={r.id} className="bg-gray-900 text-white">
                        {s?.name ?? r.metadata?.model ?? r.id}
                      </option>
                    );
                  })}
                </select>
              </div>
              {compareResult && renderPanel(compareResult)}
            </div>
          </>
        ) : (
          renderPanel(result)
        )}
      </div>
    </div>
  );
}
