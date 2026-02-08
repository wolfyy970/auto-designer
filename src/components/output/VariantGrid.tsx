import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { DimensionMap } from '../../types/compiler';
import type { GenerationResult } from '../../types/provider';
import VariantFrame from './VariantFrame';

interface VariantGridProps {
  results: GenerationResult[];
  dimensionMap: DimensionMap;
  isPreview?: boolean;
}

export default function VariantGrid({
  results,
  dimensionMap,
  isPreview = false,
}: VariantGridProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  if (results.length === 0) return null;

  const getStrategy = (variantStrategyId: string) =>
    dimensionMap.variants.find((v) => v.id === variantStrategyId);

  const activeResult = results[activeTabIndex];
  const activeStrategy = activeResult ? getStrategy(activeResult.variantStrategyId) : null;

  return (
    <div className="flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex overflow-x-auto">
          {results.map((result, index) => {
            const strategy = getStrategy(result.variantStrategyId);
            if (!strategy) return null;

            const isActive = index === activeTabIndex;
            const isGenerating = result.status === 'generating';
            const isError = result.status === 'error';

            return (
              <button
                key={result.id}
                onClick={() => setActiveTabIndex(index)}
                className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } ${isError ? 'text-red-600' : ''}`}
              >
                {isGenerating && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {isError && <AlertCircle size={14} />}
                <span>{strategy.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Variant Content */}
      <div className="mt-6">
        {activeResult && activeStrategy && (
          <>
            {activeResult.status === 'generating' && (
              <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Generating {activeStrategy.name}...
                </div>
              </div>
            )}

            {activeResult.status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6">
                <p className="text-sm font-medium text-red-800">
                  {activeStrategy.name}
                </p>
                <p className="mt-1 text-xs text-red-600">{activeResult.error}</p>
              </div>
            )}

            {activeResult.status === 'complete' && (
              <VariantFrame
                result={activeResult}
                strategy={activeStrategy}
                isPreview={isPreview}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
