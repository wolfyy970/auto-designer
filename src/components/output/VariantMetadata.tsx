import { AlertTriangle } from 'lucide-react';
import type { VariantStrategy } from '../../types/compiler';
import type { GenerationResult } from '../../types/provider';
import { badgeColor } from '../../lib/badge-colors';

interface VariantMetadataProps {
  strategy: VariantStrategy;
  result: GenerationResult;
}

export default function VariantMetadata({
  strategy,
  result,
}: VariantMetadataProps) {
  const versionBadge = result.runNumber ? badgeColor(result.runNumber) : null;

  return (
    <div className="border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-fg">{strategy.name}</h4>
        {versionBadge && (
          <span className={`rounded px-1.5 py-0.5 text-nano font-medium ${versionBadge.bg} ${versionBadge.text}`}>
            v{result.runNumber}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-fg-secondary">{strategy.hypothesis}</p>
      {result.metadata.durationMs !== undefined && result.metadata.durationMs > 0 && (
        <div className="mt-1 flex gap-3 text-xs text-fg-muted">
          <span>{result.metadata.model}</span>
          <span>{(result.metadata.durationMs / 1000).toFixed(1)}s</span>
          {result.metadata.tokensUsed && (
            <span>{result.metadata.tokensUsed} tokens</span>
          )}
        </div>
      )}
      {result.metadata.truncated && (
        <div className="mt-2 flex items-center gap-1.5 rounded bg-warning-subtle px-2 py-1 text-xs text-warning">
          <AlertTriangle size={12} />
          <span>Response truncated - code may be incomplete</span>
        </div>
      )}
    </div>
  );
}
