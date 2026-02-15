import { useCallback } from 'react';
import {
  useGenerationStore,
  nextRunNumber,
} from '../stores/generation-store';
import { getProvider } from '../services/providers/registry';
import { saveCode, saveProvenance } from '../services/idb-storage';
import type { CompiledPrompt } from '../types/compiler';
import type {
  OutputFormat,
  GenerationResult,
  Provenance,
} from '../types/provider';

export interface ProvenanceContext {
  strategies: Record<
    string,
    {
      name: string;
      primaryEmphasis: string;
      rationale: string;
      dimensionValues: Record<string, string>;
    }
  >;
  designSystemSnapshot?: string;
  format: OutputFormat;
}

/**
 * Shared generation orchestration hook.
 * Results accumulate across runs (no reset). Code is stored in IndexedDB.
 * Runs parallel for providers that support it, sequential otherwise.
 */
export function useGenerate() {
  const addResult = useGenerationStore((s) => s.addResult);
  const updateResult = useGenerationStore((s) => s.updateResult);
  const setGenerating = useGenerationStore((s) => s.setGenerating);

  const generate = useCallback(
    async (
      providerId: string,
      prompts: CompiledPrompt[],
      options: {
        format: OutputFormat;
        model: string;
        supportsVision?: boolean;
      },
      callbacks?: {
        onPlaceholdersReady?: (placeholders: GenerationResult[]) => void;
        onResultComplete?: (placeholderId: string) => void;
      },
      provenanceCtx?: ProvenanceContext,
    ): Promise<GenerationResult[]> => {
      const provider = getProvider(providerId);
      if (!provider || prompts.length === 0) return [];

      const runId = crypto.randomUUID();
      // No resetResults() — results accumulate across runs
      setGenerating(true);

      // Create placeholders — read nextRunNumber live from current state
      // so rapid double-clicks get sequential numbers (addResult is synchronous)
      const placeholderMap = new Map<string, string>();
      const placeholders = prompts.map((prompt) => {
        const placeholderId = crypto.randomUUID();
        placeholderMap.set(prompt.variantStrategyId, placeholderId);
        const currentRunNumber = nextRunNumber(
          useGenerationStore.getState(),
          prompt.variantStrategyId,
        );
        const result: GenerationResult = {
          id: placeholderId,
          variantStrategyId: prompt.variantStrategyId,
          providerId: provider.id,
          status: 'generating',
          runId,
          runNumber: currentRunNumber,
          metadata: { model: options.model },
        };
        addResult(result);
        return result;
      });

      // Notify caller so it can create/update skeleton nodes before generation starts
      callbacks?.onPlaceholdersReady?.(placeholders);

      const generateOne = async (prompt: CompiledPrompt) => {
        const placeholderId = placeholderMap.get(prompt.variantStrategyId)!;
        try {
          const result = await provider.generate(prompt, options);

          // Save code to IndexedDB (not in Zustand store)
          if (result.code) {
            await saveCode(placeholderId, result.code);
          }

          // Save provenance snapshot to IndexedDB
          if (provenanceCtx) {
            const strategySnapshot =
              provenanceCtx.strategies[prompt.variantStrategyId];
            if (strategySnapshot) {
              const provenance: Provenance = {
                hypothesisSnapshot: strategySnapshot,
                designSystemSnapshot: provenanceCtx.designSystemSnapshot,
                compiledPrompt: prompt.prompt,
                provider: providerId,
                model: options.model,
                format: provenanceCtx.format,
                timestamp: new Date().toISOString(),
              };
              await saveProvenance(placeholderId, provenance);
            }
          }

          // Update metadata in Zustand (no code — it's in IndexedDB)
          updateResult(placeholderId, {
            id: placeholderId,
            status: 'complete',
            metadata: result.metadata,
          });
          callbacks?.onResultComplete?.(placeholderId);
        } catch (err) {
          updateResult(placeholderId, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Generation failed',
          });
        }
      };

      if (provider.supportsParallel) {
        await Promise.all(prompts.map(generateOne));
      } else {
        // Sequential — LM Studio returns 500 on concurrent requests
        for (const prompt of prompts) {
          await generateOne(prompt);
        }
      }

      setGenerating(false);
      return placeholders;
    },
    [addResult, updateResult, setGenerating],
  );

  return generate;
}
