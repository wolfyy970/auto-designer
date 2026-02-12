import { useState, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useCompilerStore, selectDimensionMap } from '../../stores/compiler-store';
import { useGenerationStore } from '../../stores/generation-store';
import { useGenerate } from '../../hooks/useGenerate';
import { DEFAULT_GENERATION_PROVIDER } from '../../lib/constants';
import type { OutputFormat } from '../../types/provider';
import { useProviderModels } from '../../hooks/useProviderModels';
import ModelSelector from '../shared/ModelSelector';
import ProviderSelector from './ProviderSelector';
import VariantGrid from '../output/VariantGrid';

export default function GenerationPanel() {
  const compiledPrompts = useCompilerStore((s) => s.compiledPrompts);
  const dimensionMap = useCompilerStore(selectDimensionMap);
  const results = useGenerationStore((s) => s.results);
  const isGenerating = useGenerationStore((s) => s.isGenerating);

  const [format, setFormat] = useState<OutputFormat>('react');
  const [providerId, setProviderId] = useState(DEFAULT_GENERATION_PROVIDER);
  const [generationModel, setGenerationModel] = useState('');
  const { data: models } = useProviderModels(providerId);

  const generate = useGenerate();

  const handleProviderChange = useCallback((newProviderId: string) => {
    setProviderId(newProviderId);
    setGenerationModel('');
  }, []);

  const handleGenerate = useCallback(async () => {
    const modelData = models?.find((m) => m.id === generationModel);
    const supportsVision = modelData?.supportsVision ?? false;
    await generate(providerId, compiledPrompts, { format, model: generationModel, supportsVision });
  }, [generate, providerId, compiledPrompts, format, generationModel, models]);

  if (compiledPrompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-center">
          <div className="mb-3 text-4xl">✨</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Variants Ready</h3>
          <p className="mb-6 text-sm text-gray-500">
            Complete your spec, compile it, and approve the exploration space first.
          </p>
          <a
            href="/compiler"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Go to Exploration Space
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Simplified Controls - Constrained width */}
      <div className="mx-auto max-w-6xl px-8">
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <ProviderSelector
                selectedId={providerId}
                onChange={handleProviderChange}
              />

              <ModelSelector
                label="Model"
                providerId={providerId}
                selectedModelId={generationModel}
                onChange={setGenerationModel}
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as OutputFormat)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                >
                  <option value="react">React</option>
                  <option value="html">HTML</option>
                </select>
              </div>

              <div className="text-sm text-gray-600">
                {compiledPrompts.length} {compiledPrompts.length === 1 ? 'variant' : 'variants'}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Variants
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results - Full Width */}
      {results.length > 0 && dimensionMap && (
        <div className="mt-6">
          <VariantGrid
            results={results}
            dimensionMap={dimensionMap}
            isPreview={false}
          />
        </div>
      )}
    </>
  );
}
