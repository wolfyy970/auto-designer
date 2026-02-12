import { useCallback } from 'react';
import { useGenerationStore } from '../stores/generation-store';
import { getProvider } from '../services/providers/registry';
import type { CompiledPrompt } from '../types/compiler';
import type { OutputFormat, GenerationResult } from '../types/provider';

/**
 * Shared generation orchestration hook.
 * Handles placeholder creation, parallel generation, and error handling.
 */
export function useGenerate() {
  const addResult = useGenerationStore((s) => s.addResult);
  const updateResult = useGenerationStore((s) => s.updateResult);
  const setGenerating = useGenerationStore((s) => s.setGenerating);
  const resetResults = useGenerationStore((s) => s.reset);

  const generate = useCallback(
    async (
      providerId: string,
      prompts: CompiledPrompt[],
      options: { format: OutputFormat; model: string; supportsVision?: boolean }
    ): Promise<GenerationResult[]> => {
      const provider = getProvider(providerId);
      if (!provider || prompts.length === 0) return [];

      resetResults();
      setGenerating(true);

      // Create placeholders
      const placeholderMap = new Map<string, string>();
      const placeholders = prompts.map((prompt) => {
        const placeholderId = crypto.randomUUID();
        placeholderMap.set(prompt.variantStrategyId, placeholderId);
        const result: GenerationResult = {
          id: placeholderId,
          variantStrategyId: prompt.variantStrategyId,
          providerId: provider.id,
          status: 'generating',
          metadata: { model: '' },
        };
        addResult(result);
        return result;
      });

      // Generate sequentially to avoid overloading local inference servers
      for (const prompt of prompts) {
        const placeholderId = placeholderMap.get(prompt.variantStrategyId)!;
        try {
          const result = await provider.generate(prompt, options);
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
      }

      setGenerating(false);
      return placeholders;
    },
    [addResult, updateResult, setGenerating, resetResults]
  );

  return generate;
}
