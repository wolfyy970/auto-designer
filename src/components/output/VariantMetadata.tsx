import { AlertTriangle } from 'lucide-react';
import type { VariantStrategy } from '../../types/compiler';
import type { GenerationResult } from '../../types/provider';

interface VariantMetadataProps {
  strategy: VariantStrategy;
  result: GenerationResult;
}

export default function VariantMetadata({
  strategy,
  result,
}: VariantMetadataProps) {
  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <h4 className="text-sm font-semibold text-gray-900">{strategy.name}</h4>
      <p className="mt-0.5 text-xs text-gray-500">{strategy.primaryEmphasis}</p>
      {result.metadata.durationMs !== undefined && result.metadata.durationMs > 0 && (
        <div className="mt-1 flex gap-3 text-xs text-gray-400">
          <span>{result.metadata.model}</span>
          <span>{(result.metadata.durationMs / 1000).toFixed(1)}s</span>
          {result.metadata.tokensUsed && (
            <span>{result.metadata.tokensUsed} tokens</span>
          )}
        </div>
      )}
      {result.metadata.truncated && (
        <div className="mt-2 flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          <AlertTriangle size={12} />
          <span>Response truncated - code may be incomplete</span>
        </div>
      )}
    </div>
  );
}
