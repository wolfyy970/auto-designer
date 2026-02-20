import { useCallback } from 'react';
import { normalizeError } from '../lib/error-utils';
import {
  useGenerationStore,
  nextRunNumber,
} from '../stores/generation-store';
import { getProvider } from '../services/providers/registry';
import { saveCode, saveProvenance } from '../services/idb-storage';
import { runAgenticBuild } from '../services/agent/orchestrator';
import { getPrompt } from '../stores/prompt-store';
import type { CompiledPrompt } from '../types/compiler';
import type {
  GenerationResult,
  Provenance,
} from '../types/provider';

export interface ProvenanceContext {
  strategies: Record<
    string,
    {
      name: string;
      hypothesis: string;
      rationale: string;
      dimensionValues: Record<string, string>;
    }
  >;
  designSystemSnapshot?: string;
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
        model: string;
        supportsVision?: boolean;
      },
      callbacks?: {
        onPlaceholdersReady?: (placeholders: GenerationResult[]) => void;
        onResultComplete?: (placeholderId: string) => void;
      },
      provenanceCtx?: ProvenanceContext,
      config?: { manageGenerating?: boolean },
    ): Promise<GenerationResult[]> => {
      const provider = getProvider(providerId);
      if (!provider || prompts.length === 0) return [];

      const manage = config?.manageGenerating !== false;
      const runId = crypto.randomUUID();
      // No resetResults() — results accumulate across runs
      if (manage) setGenerating(true);

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
          const workspace = await runAgenticBuild(
            getPrompt('agentSystemBuilder'),
            prompt.prompt,
            provider,
            {
              model: options.model,
              supportsVision: options.supportsVision,
              plannerSystemPrompt: getPrompt('agentSystemPlanner'),
              onProgress: (status) => console.log(`[Agent ${placeholderId.slice(0, 8)}] ${status}`),
            }
          );

          const bundledHtml = workspace.bundleToHtml();

          // Save code to IndexedDB (not in Zustand store)
          if (bundledHtml) {
            try {
              await saveCode(placeholderId, bundledHtml);
              if (import.meta.env.DEV) {
                console.log(`[useGenerate] Saved bundled code for ${placeholderId.slice(0, 8)}... (${bundledHtml.length} chars)`);
              }
            } catch (saveErr) {
              console.error('[useGenerate] Failed to save code to IndexedDB:', saveErr);
              throw new Error(`Failed to save code: ${normalizeError(saveErr)}`);
            }
          } else {
            console.warn(`[useGenerate] No code in bundled workspace for ${placeholderId.slice(0, 8)}...`);
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
                timestamp: new Date().toISOString(),
              };
              await saveProvenance(placeholderId, provenance);
            }
          }

          // Update metadata in Zustand
          updateResult(placeholderId, {
            id: placeholderId,
            status: 'complete',
            metadata: {
              model: options.model,
              completedAt: new Date().toISOString(),
            },
          });
          callbacks?.onResultComplete?.(placeholderId);
        } catch (err) {
          updateResult(placeholderId, {
            status: 'error',
            error: normalizeError(err, 'Generation failed'),
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

      if (manage) setGenerating(false);
      return placeholders;
    },
    [addResult, updateResult, setGenerating],
  );

  return generate;
}
