import { useState, useMemo } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useCompilerStore } from '../../stores/compiler-store';
import { useGenerationStore } from '../../stores/generation-store';
import { getProvider } from '../../services/providers/registry';
import { getModelTiersForProvider, DEFAULT_GENERATION_MODEL, DEFAULT_GENERATION_PROVIDER } from '../../lib/constants';
import type { OutputFormat } from '../../types/provider';
import ModelSelector from '../shared/ModelSelector';
import ProviderSelector from './ProviderSelector';
import VariantGrid from '../output/VariantGrid';

export default function GenerationPanel() {
  const compiledPrompts = useCompilerStore((s) => s.compiledPrompts);
  const dimensionMap = useCompilerStore((s) => s.dimensionMap);
  const results = useGenerationStore((s) => s.results);
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const addResult = useGenerationStore((s) => s.addResult);
  const updateResult = useGenerationStore((s) => s.updateResult);
  const setGenerating = useGenerationStore((s) => s.setGenerating);
  const resetResults = useGenerationStore((s) => s.reset);

  const [format, setFormat] = useState<OutputFormat>('react');
  const [providerId, setProviderId] = useState(DEFAULT_GENERATION_PROVIDER);

  // Get model tiers for selected provider
  const modelTiers = useMemo(() => getModelTiersForProvider(providerId), [providerId]);
  const [generationModel, setGenerationModel] = useState(DEFAULT_GENERATION_MODEL);

  // Reset model to first tier option when provider changes
  const handleProviderChange = (newProviderId: string) => {
    setProviderId(newProviderId);
    const newTiers = getModelTiersForProvider(newProviderId);
    setGenerationModel(newTiers[1]?.id || newTiers[0]?.id); // Default to balanced tier
  };

  const handleGenerate = async () => {
    const provider = getProvider(providerId);
    if (!provider || compiledPrompts.length === 0) return;

    resetResults();
    setGenerating(true);

    // Create placeholder results for all prompts
    const placeholderMap = new Map<string, string>();
    compiledPrompts.forEach((prompt) => {
      const placeholderId = crypto.randomUUID();
      placeholderMap.set(prompt.variantStrategyId, placeholderId);
      addResult({
        id: placeholderId,
        variantStrategyId: prompt.variantStrategyId,
        providerId: provider.id,
        status: 'generating',
        metadata: { model: '' },
      });
    });

    // Generate all variants in parallel (batch processing)
    await Promise.all(
      compiledPrompts.map(async (prompt) => {
        const placeholderId = placeholderMap.get(prompt.variantStrategyId)!;
        try {
          const result = await provider.generate(prompt, { format, model: generationModel });
          updateResult(placeholderId, {
            ...result,
            id: placeholderId,
            status: 'complete',
          });
        } catch (err) {
          updateResult(placeholderId, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Generation failed',
          });
        }
      })
    );

    setGenerating(false);
  };

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
                models={modelTiers}
                selectedId={generationModel}
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
