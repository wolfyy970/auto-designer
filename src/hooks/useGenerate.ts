import { useCallback } from 'react';
import { normalizeError } from '../lib/error-utils';
import {
  useGenerationStore,
  nextRunNumber,
} from '../stores/generation-store';
import { storage } from '../storage';
import { getPrompt } from '../stores/prompt-store';
import { generate as apiGenerate } from '../api/client';
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
      if (prompts.length === 0) return [];

      const manage = config?.manageGenerating !== false;
      const runId = crypto.randomUUID();
      if (manage) setGenerating(true);

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
          providerId,
          status: 'generating',
          runId,
          runNumber: currentRunNumber,
          metadata: { model: options.model },
        };
        addResult(result);
        return result;
      });

      callbacks?.onPlaceholdersReady?.(placeholders);

      const generateOne = async (prompt: CompiledPrompt) => {
        const placeholderId = placeholderMap.get(prompt.variantStrategyId)!;
        try {
          const activityLog: string[] = [];
          let generatedCode = '';

          await apiGenerate(
            {
              prompt: prompt.prompt,
              providerId,
              modelId: options.model,
              promptOverrides: {
                agentSystemBuilder: getPrompt('agentSystemBuilder'),
                agentSystemPlanner: getPrompt('agentSystemPlanner'),
              },
              supportsVision: options.supportsVision,
            },
            {
              onActivity: (entry) => {
                activityLog.push(entry);
                updateResult(placeholderId, { activityLog: [...activityLog] });
              },
              onProgress: (status) => {
                const updates: Partial<GenerationResult> = {
                  progressMessage: status,
                };

                const planMatch = status.match(/^Plan ready: (\d+) files/);
                if (planMatch) {
                  updates.progressStep = { current: 1, total: parseInt(planMatch[1], 10) };
                }

                if (status.startsWith('Wrote ') || status.startsWith('Patched ')) {
                  const prev = useGenerationStore.getState().results.find((r) => r.id === placeholderId);
                  const prevStep = prev?.progressStep;
                  if (prevStep && prevStep.current < prevStep.total) {
                    updates.progressStep = {
                      current: Math.min(prevStep.current + 1, prevStep.total),
                      total: prevStep.total,
                    };
                  }
                }

                updateResult(placeholderId, updates);
              },
              onCode: (code) => {
                generatedCode = code;
              },
              onError: (error) => {
                updateResult(placeholderId, { status: 'error', error });
              },
            },
          );

          if (!generatedCode) {
            updateResult(placeholderId, {
              status: 'error',
              error: 'Server returned no code. The model likely responded with prose instead of tool calls.',
            });
            return;
          }

          await storage.saveCode(placeholderId, generatedCode);

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
              await storage.saveProvenance(placeholderId, provenance);
            }
          }

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

      await Promise.all(prompts.map((prompt) => generateOne(prompt)));

      if (manage) {
        const stillGenerating = useGenerationStore.getState().results.some(
          (r) => r.status === 'generating',
        );
        if (!stillGenerating) setGenerating(false);
      }
      return placeholders;
    },
    [addResult, updateResult, setGenerating],
  );

  return generate;
}
